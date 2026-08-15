-- Additive Migration: Transactional Imports for India Post Rates & Pincodes
-- File: supabase/migrations/20260724_india_post_transactional_imports.sql
-- Description: Creates transactional PostgreSQL RPC functions for verified imports.

-- 1. Unique slab index preventing identical duplicate slabs
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tariff_slab 
ON public.india_post_tariff_rates(tariff_version_id, destination_zone_code, service_code, min_weight_grams, max_weight_grams);

-- 2. Transactional Tariff Rates Import RPC
CREATE OR REPLACE FUNCTION public.import_india_post_tariff_rates_transactional(
  p_tariff_version_id UUID,
  p_rates JSONB,
  p_admin_id UUID DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_verified_at TIMESTAMPTZ;
  v_is_active BOOLEAN;
  v_is_archived BOOLEAN;
  v_inserted_count INT := 0;
  val JSONB;
  
  -- Extraction variables
  v_dest_zone TEXT;
  v_service TEXT;
  v_raw_min JSONB;
  v_raw_max JSONB;
  v_raw_base_w JSONB;
  v_raw_base_r JSONB;
  v_raw_add_w JSONB;
  v_raw_add_r JSONB;
  v_raw_tax JSONB;
  v_raw_remote JSONB;
  v_raw_est_min JSONB;
  v_raw_est_max JSONB;
  v_raw_serv JSONB;

  v_min_w INT;
  v_max_w INT;
  v_base_w INT;
  v_base_r INT;
  v_add_w INT;
  v_add_r INT;
  v_tax INT;
  v_remote INT;
  v_est_min INT;
  v_est_max INT;
  v_serv BOOLEAN;
BEGIN
  -- 1. Validate top-level JSON array
  IF p_rates IS NULL OR jsonb_typeof(p_rates) <> 'array' THEN
    RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
  END IF;

  v_count := jsonb_array_length(p_rates);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
  END IF;

  -- 2. Prevent concurrent import races: Lock the actual version row directly
  SELECT verified_at, is_active, is_archived
  INTO v_verified_at, v_is_active, v_is_archived
  FROM public.india_post_tariff_versions
  WHERE id = p_tariff_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIPPING_TARIFF_NOT_FOUND';
  END IF;

  IF v_verified_at IS NOT NULL OR v_is_active OR v_is_archived THEN
    RAISE EXCEPTION 'SHIPPING_TARIFF_NOT_DRAFT';
  END IF;

  -- 3. Create temporary table for safe normalized validation without pre-casts
  CREATE TEMP TABLE tmp_tariff_import (
    destination_zone_code TEXT NOT NULL,
    service_code TEXT NOT NULL,
    min_weight_grams INT NOT NULL,
    max_weight_grams INT NOT NULL,
    base_weight_grams INT NOT NULL,
    base_rate_paise INT NOT NULL,
    additional_slab_grams INT NOT NULL,
    additional_slab_rate_paise INT NOT NULL,
    tax_rate_basis_points INT NOT NULL,
    remote_surcharge_paise INT,
    estimated_min_days INT,
    estimated_max_days INT,
    is_serviceable BOOLEAN
  ) ON COMMIT DROP;

  -- 4. Single-pass row-by-row validation & normalization before any set operations
  FOR val IN SELECT jsonb_array_elements(p_rates)
  LOOP
    v_dest_zone := val->>'destination_zone_code';
    v_service := val->>'service_code';
    v_raw_min := val->'min_weight_grams';
    v_raw_max := val->'max_weight_grams';
    v_raw_base_w := val->'base_weight_grams';
    v_raw_base_r := val->'base_rate_paise';
    v_raw_add_w := val->'additional_slab_grams';
    v_raw_add_r := val->'additional_slab_rate_paise';
    v_raw_tax := val->'tax_rate_basis_points';
    v_raw_remote := val->'remote_surcharge_paise';
    v_raw_est_min := val->'estimated_min_days';
    v_raw_est_max := val->'estimated_max_days';
    v_raw_serv := val->'is_serviceable';

    -- A. Validate non-null text strings
    IF v_dest_zone IS NULL OR trim(v_dest_zone) = '' OR
       v_service IS NULL OR trim(v_service) = ''
    THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    IF v_service <> 'speed_post_parcel_domestic' THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    IF v_dest_zone NOT IN ('local', 'up_to_200_km', '201_to_1000_km', '1001_to_2000_km', 'above_2000_km') THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_ZONE';
    END IF;

    -- B. Validate required JSONB fields are numeric type (no strings, objects, or nulls)
    IF v_raw_min IS NULL OR jsonb_typeof(v_raw_min) <> 'number' OR
       v_raw_max IS NULL OR jsonb_typeof(v_raw_max) <> 'number' OR
       v_raw_base_w IS NULL OR jsonb_typeof(v_raw_base_w) <> 'number' OR
       v_raw_base_r IS NULL OR jsonb_typeof(v_raw_base_r) <> 'number' OR
       v_raw_add_w IS NULL OR jsonb_typeof(v_raw_add_w) <> 'number' OR
       v_raw_add_r IS NULL OR jsonb_typeof(v_raw_add_r) <> 'number' OR
       v_raw_tax IS NULL OR jsonb_typeof(v_raw_tax) <> 'number'
    THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    -- C. Validate exact whole integers and 32-bit INT ranges
    IF (v_raw_min::numeric % 1) <> 0 OR v_raw_min::numeric < -2147483648 OR v_raw_min::numeric > 2147483647 OR
       (v_raw_max::numeric % 1) <> 0 OR v_raw_max::numeric < -2147483648 OR v_raw_max::numeric > 2147483647 OR
       (v_raw_base_w::numeric % 1) <> 0 OR v_raw_base_w::numeric < -2147483648 OR v_raw_base_w::numeric > 2147483647 OR
       (v_raw_base_r::numeric % 1) <> 0 OR v_raw_base_r::numeric < -2147483648 OR v_raw_base_r::numeric > 2147483647 OR
       (v_raw_add_w::numeric % 1) <> 0 OR v_raw_add_w::numeric < -2147483648 OR v_raw_add_w::numeric > 2147483647 OR
       (v_raw_add_r::numeric % 1) <> 0 OR v_raw_add_r::numeric < -2147483648 OR v_raw_add_r::numeric > 2147483647 OR
       (v_raw_tax::numeric % 1) <> 0 OR v_raw_tax::numeric < -2147483648 OR v_raw_tax::numeric > 2147483647
    THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    v_min_w := v_raw_min::INT;
    v_max_w := v_raw_max::INT;
    v_base_w := v_raw_base_w::INT;
    v_base_r := v_raw_base_r::INT;
    v_add_w := v_raw_add_w::INT;
    v_add_r := v_raw_add_r::INT;
    v_tax := v_raw_tax::INT;

    -- D. Validate bounds
    IF v_min_w < 0 OR v_max_w < 0 OR v_base_w < 0 OR v_base_r < 0 OR v_add_w < 0 OR v_add_r < 0 OR v_tax < 0 THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    IF v_max_w < v_min_w THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    IF v_tax > 10000 THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    IF v_add_r > 0 AND v_add_w <= 0 THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
    END IF;

    -- E. Validate optional remote surcharge
    IF v_raw_remote IS NOT NULL AND jsonb_typeof(v_raw_remote) <> 'null' THEN
      IF jsonb_typeof(v_raw_remote) <> 'number' OR (v_raw_remote::numeric % 1) <> 0 OR v_raw_remote::numeric < -2147483648 OR v_raw_remote::numeric > 2147483647 THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
      v_remote := v_raw_remote::INT;
      IF v_remote < 0 THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
    ELSE
      v_remote := NULL;
    END IF;

    -- F. Validate optional estimates
    IF v_raw_est_min IS NOT NULL AND jsonb_typeof(v_raw_est_min) <> 'null' THEN
      IF jsonb_typeof(v_raw_est_min) <> 'number' OR (v_raw_est_min::numeric % 1) <> 0 OR v_raw_est_min::numeric < -2147483648 OR v_raw_est_min::numeric > 2147483647 THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
      v_est_min := v_raw_est_min::INT;
      IF v_est_min < 0 THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
    ELSE
      v_est_min := NULL;
    END IF;

    IF v_raw_est_max IS NOT NULL AND jsonb_typeof(v_raw_est_max) <> 'null' THEN
      IF jsonb_typeof(v_raw_est_max) <> 'number' OR (v_raw_est_max::numeric % 1) <> 0 OR v_raw_est_max::numeric < -2147483648 OR v_raw_est_max::numeric > 2147483647 THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
      v_est_max := v_raw_est_max::INT;
      IF v_est_max < 0 THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
    ELSE
      v_est_max := NULL;
    END IF;

    IF v_est_min IS NOT NULL AND v_est_max IS NOT NULL THEN
      IF v_est_max < v_est_min THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
    END IF;

    -- G. Validate optional serviceable flag
    IF v_raw_serv IS NOT NULL AND jsonb_typeof(v_raw_serv) <> 'null' THEN
      IF jsonb_typeof(v_raw_serv) <> 'boolean' THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_TARIFF_FIELD';
      END IF;
      v_serv := v_raw_serv::BOOLEAN;
    ELSE
      v_serv := NULL;
    END IF;

    -- Insert normalized validated row into temporary table
    INSERT INTO tmp_tariff_import (
      destination_zone_code,
      service_code,
      min_weight_grams,
      max_weight_grams,
      base_weight_grams,
      base_rate_paise,
      additional_slab_grams,
      additional_slab_rate_paise,
      tax_rate_basis_points,
      remote_surcharge_paise,
      estimated_min_days,
      estimated_max_days,
      is_serviceable
    ) VALUES (
      v_dest_zone,
      v_service,
      v_min_w,
      v_max_w,
      v_base_w,
      v_base_r,
      v_add_w,
      v_add_r,
      v_tax,
      v_remote,
      v_est_min,
      v_est_max,
      v_serv
    );
  END LOOP;

  -- 5. Duplicate Check inside input batch
  IF EXISTS (
    SELECT 1 
    FROM tmp_tariff_import
    GROUP BY destination_zone_code, service_code, min_weight_grams, max_weight_grams
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'SHIPPING_DUPLICATE_SLAB';
  END IF;

  -- 6. Overlap Check inside input batch
  IF EXISTS (
    SELECT 1
    FROM tmp_tariff_import a
    JOIN tmp_tariff_import b 
      ON a.destination_zone_code = b.destination_zone_code
     AND a.service_code = b.service_code
     AND (a.min_weight_grams <> b.min_weight_grams OR a.max_weight_grams <> b.max_weight_grams)
     AND (a.max_weight_grams >= b.min_weight_grams AND a.min_weight_grams <= b.max_weight_grams)
  ) THEN
    RAISE EXCEPTION 'SHIPPING_OVERLAPPING_SLAB';
  END IF;

  -- 7. Existing Database Duplicate Check
  IF EXISTS (
    SELECT 1 
    FROM public.india_post_tariff_rates db_rates
    JOIN tmp_tariff_import t ON db_rates.tariff_version_id = p_tariff_version_id
      AND db_rates.destination_zone_code = t.destination_zone_code
      AND db_rates.service_code = t.service_code
      AND db_rates.min_weight_grams = t.min_weight_grams
      AND db_rates.max_weight_grams = t.max_weight_grams
  ) THEN
    RAISE EXCEPTION 'SHIPPING_DUPLICATE_SLAB';
  END IF;

  -- 8. Existing Database Overlap Check
  IF EXISTS (
    SELECT 1 
    FROM public.india_post_tariff_rates db_rates
    JOIN tmp_tariff_import t ON db_rates.tariff_version_id = p_tariff_version_id
      AND db_rates.destination_zone_code = t.destination_zone_code
      AND db_rates.service_code = t.service_code
      AND (db_rates.max_weight_grams >= t.min_weight_grams AND db_rates.min_weight_grams <= t.max_weight_grams)
  ) THEN
    RAISE EXCEPTION 'SHIPPING_OVERLAPPING_SLAB';
  END IF;

  -- 9. Insert all rows into production table
  INSERT INTO public.india_post_tariff_rates (
    tariff_version_id,
    destination_zone_code,
    service_code,
    min_weight_grams,
    max_weight_grams,
    base_weight_grams,
    base_rate_paise,
    additional_slab_grams,
    additional_slab_rate_paise,
    tax_rate_basis_points,
    remote_surcharge_paise,
    estimated_min_days,
    estimated_max_days,
    is_serviceable
  )
  SELECT 
    p_tariff_version_id,
    destination_zone_code,
    service_code,
    min_weight_grams,
    max_weight_grams,
    base_weight_grams,
    base_rate_paise,
    additional_slab_grams,
    additional_slab_rate_paise,
    tax_rate_basis_points,
    remote_surcharge_paise,
    estimated_min_days,
    estimated_max_days,
    is_serviceable
  FROM tmp_tariff_import;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- 10. Log activity inside transaction
  INSERT INTO public.activity_logs (user_id, user_email, action, details)
  VALUES (p_admin_id, p_admin_email, 'shipping.rates_imported', jsonb_build_object(
    'tariff_version_id', p_tariff_version_id,
    'insertedCount', v_inserted_count,
    'duplicateCount', 0,
    'rejectedCount', 0
  ));

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted_count,
    'updated', 0,
    'skipped', 0,
    'rejected', 0
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Transactional Pincodes Import RPC
CREATE OR REPLACE FUNCTION public.import_india_post_pincodes_transactional(
  p_pincodes JSONB,
  p_source_reference TEXT,
  p_replace_mode BOOLEAN DEFAULT false,
  p_admin_id UUID DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_inserted_count INT := 0;
  v_updated_count INT := 0;
  v_skipped_count INT := 0;
  val JSONB;
  v_pin TEXT;
  v_office TEXT;
  v_dist TEXT;
  v_st TEXT;
  v_reg TEXT;
  v_circ TEXT;
  v_zone TEXT;
  v_raw_rem JSONB;
  v_raw_serv JSONB;
  v_raw_lat JSONB;
  v_raw_lon JSONB;
  v_rem BOOLEAN;
  v_serv BOOLEAN;
BEGIN
  -- 1. Validate top-level JSON array
  IF p_pincodes IS NULL OR jsonb_typeof(p_pincodes) <> 'array' THEN
    RAISE EXCEPTION 'SHIPPING_INVALID_PINCODE';
  END IF;

  v_count := jsonb_array_length(p_pincodes);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'SHIPPING_INVALID_PINCODE';
  END IF;

  -- 2. Check source reference
  IF p_source_reference IS NULL OR trim(p_source_reference) = '' THEN
    RAISE EXCEPTION 'SHIPPING_INVALID_PINCODE';
  END IF;

  -- 3. Obtain transaction-scoped advisory lock to serialize concurrent admin pincode imports
  PERFORM pg_advisory_xact_lock(hashtext('shreengar_india_post_pincode_import'));

  -- 4. Create temporary table for safe batch validation and duplicate detection
  CREATE TEMP TABLE tmp_pincodes_import (
    pincode TEXT PRIMARY KEY,
    office_name TEXT,
    district TEXT,
    state TEXT,
    region TEXT,
    circle TEXT,
    postal_zone_code TEXT,
    is_remote BOOLEAN,
    is_serviceable BOOLEAN
  ) ON COMMIT DROP;

  -- 5. Single-pass element validation & insertion into temp table
  FOR val IN SELECT jsonb_array_elements(p_pincodes)
  LOOP
    IF jsonb_typeof(val) <> 'object' THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_PINCODE';
    END IF;

    v_pin := val->>'pincode';
    v_office := NULLIF(trim(val->>'office_name'), '');
    v_dist := NULLIF(trim(val->>'district'), '');
    v_st := NULLIF(trim(val->>'state'), '');
    v_reg := NULLIF(trim(val->>'region'), '');
    v_circ := NULLIF(trim(val->>'circle'), '');
    v_zone := NULLIF(trim(val->>'postal_zone_code'), '');
    v_raw_rem := val->'is_remote';
    v_raw_serv := val->'is_serviceable';
    v_raw_lat := val->'latitude';
    v_raw_lon := val->'longitude';

    -- A. Validate 6-digit pincode format
    IF v_pin IS NULL
       OR trim(v_pin) = ''
       OR v_pin !~ '^[0-9]{6}$'
    THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_PINCODE';
    END IF;

    -- B. Validate pincode zones
    IF v_zone IS NOT NULL AND v_zone NOT IN ('local', 'up_to_200_km', '201_to_1000_km', '1001_to_2000_km', 'above_2000_km') THEN
      RAISE EXCEPTION 'SHIPPING_INVALID_ZONE';
    END IF;

    -- C. Validate Boolean field types strictly before any cast
    IF v_raw_rem IS NOT NULL AND jsonb_typeof(v_raw_rem) <> 'null' THEN
      IF jsonb_typeof(v_raw_rem) <> 'boolean' THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_PINCODE';
      END IF;
      v_rem := v_raw_rem::BOOLEAN;
    ELSE
      v_rem := NULL;
    END IF;

    IF v_raw_serv IS NOT NULL AND jsonb_typeof(v_raw_serv) <> 'null' THEN
      IF jsonb_typeof(v_raw_serv) <> 'boolean' THEN
        RAISE EXCEPTION 'SHIPPING_INVALID_PINCODE';
      END IF;
      v_serv := v_raw_serv::BOOLEAN;
    ELSE
      v_serv := NULL;
    END IF;

    -- D. Coordinate safety: Reject non-null coordinates since there is no verified coordinate workflow
    IF (v_raw_lat IS NOT NULL AND jsonb_typeof(v_raw_lat) <> 'null') OR
       (v_raw_lon IS NOT NULL AND jsonb_typeof(v_raw_lon) <> 'null') 
    THEN
      RAISE EXCEPTION 'SHIPPING_COORDINATES_NOT_ALLOWED';
    END IF;

    -- E. Reject duplicate pincodes inside input batch immediately
    IF EXISTS (SELECT 1 FROM tmp_pincodes_import WHERE pincode = v_pin) THEN
      RAISE EXCEPTION 'SHIPPING_DUPLICATE_PINCODE';
    END IF;

    INSERT INTO tmp_pincodes_import (
      pincode, office_name, district, state, region, circle, postal_zone_code, is_remote, is_serviceable
    ) VALUES (
      v_pin, v_office, v_dist, v_st, v_reg, v_circ, v_zone, v_rem, v_serv
    );
  END LOOP;

  -- 6. Pre-write Classification Table against original production table state
  CREATE TEMP TABLE tmp_pincode_classification (
    pincode TEXT PRIMARY KEY,
    classification TEXT NOT NULL CHECK (classification IN ('new', 'changed', 'unchanged'))
  ) ON COMMIT DROP;

  INSERT INTO tmp_pincode_classification (pincode, classification)
  SELECT 
    tmp.pincode,
    CASE 
      WHEN p.pincode IS NULL THEN 'new'
      WHEN (
        (tmp.office_name IS NOT NULL AND tmp.office_name IS DISTINCT FROM p.office_name) OR
        (tmp.district IS NOT NULL AND tmp.district IS DISTINCT FROM p.district) OR
        (tmp.state IS NOT NULL AND tmp.state IS DISTINCT FROM p.state) OR
        (tmp.region IS NOT NULL AND tmp.region IS DISTINCT FROM p.region) OR
        (tmp.circle IS NOT NULL AND tmp.circle IS DISTINCT FROM p.circle) OR
        (tmp.postal_zone_code IS NOT NULL AND tmp.postal_zone_code IS DISTINCT FROM p.postal_zone_code) OR
        (tmp.is_remote IS NOT NULL AND tmp.is_remote IS DISTINCT FROM p.is_remote) OR
        (tmp.is_serviceable IS NOT NULL AND tmp.is_serviceable IS DISTINCT FROM p.is_serviceable)
      ) THEN 'changed'
      ELSE 'unchanged'
    END AS classification
  FROM tmp_pincodes_import tmp
  LEFT JOIN public.india_post_pincodes p ON tmp.pincode = p.pincode;

  -- 7. Compute exact non-overlapping counts BEFORE performing any writes
  SELECT COUNT(*) INTO v_inserted_count 
  FROM tmp_pincode_classification 
  WHERE classification = 'new';

  IF p_replace_mode THEN
    SELECT COUNT(*) INTO v_updated_count 
    FROM tmp_pincode_classification 
    WHERE classification = 'changed';

    SELECT COUNT(*) INTO v_skipped_count 
    FROM tmp_pincode_classification 
    WHERE classification = 'unchanged';
  ELSE
    v_updated_count := 0;
    SELECT COUNT(*) INTO v_skipped_count 
    FROM tmp_pincode_classification 
    WHERE classification IN ('changed', 'unchanged');
  END IF;

  -- 8. Perform Production Writes based strictly on pre-write classification
  -- A. Insert newly classified pincodes
  INSERT INTO public.india_post_pincodes (
    pincode, office_name, district, state, region, circle, postal_zone_code, is_remote, is_serviceable, source_reference, imported_at, updated_at
  )
  SELECT 
    tmp.pincode, tmp.office_name, tmp.district, tmp.state, tmp.region, tmp.circle, tmp.postal_zone_code, tmp.is_remote, tmp.is_serviceable, p_source_reference, NOW(), NOW()
  FROM tmp_pincodes_import tmp
  JOIN tmp_pincode_classification c ON tmp.pincode = c.pincode
  WHERE c.classification = 'new';

  -- B. Update changed existing pincodes if replace_mode is true
  IF p_replace_mode THEN
    UPDATE public.india_post_pincodes p
    SET 
      office_name = COALESCE(tmp.office_name, p.office_name),
      district = COALESCE(tmp.district, p.district),
      state = COALESCE(tmp.state, p.state),
      region = COALESCE(tmp.region, p.region),
      circle = COALESCE(tmp.circle, p.circle),
      postal_zone_code = COALESCE(tmp.postal_zone_code, p.postal_zone_code),
      is_remote = COALESCE(tmp.is_remote, p.is_remote),
      is_serviceable = COALESCE(tmp.is_serviceable, p.is_serviceable),
      source_reference = CASE 
        WHEN (tmp.postal_zone_code IS NOT NULL AND tmp.postal_zone_code IS DISTINCT FROM p.postal_zone_code) OR
             (tmp.is_remote IS NOT NULL AND tmp.is_remote IS DISTINCT FROM p.is_remote) OR
             (tmp.is_serviceable IS NOT NULL AND tmp.is_serviceable IS DISTINCT FROM p.is_serviceable)
        THEN p_source_reference 
        ELSE p.source_reference 
      END,
      updated_at = NOW()
    FROM tmp_pincodes_import tmp
    JOIN tmp_pincode_classification c ON tmp.pincode = c.pincode
    WHERE p.pincode = tmp.pincode
      AND c.classification = 'changed';
  END IF;

  -- 9. Log activity inside transaction
  INSERT INTO public.activity_logs (user_id, user_email, action, details)
  VALUES (p_admin_id, p_admin_email, 'shipping.pincode_data_imported', jsonb_build_object(
    'source_reference', p_source_reference,
    'insertedCount', v_inserted_count,
    'updatedCount', v_updated_count,
    'duplicateCount', v_skipped_count,
    'rejectedCount', 0
  ));

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted_count,
    'updated', v_updated_count,
    'skipped', v_skipped_count,
    'rejected', 0
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Revoke direct public privileges and assign to service_role
REVOKE ALL ON FUNCTION public.import_india_post_tariff_rates_transactional(UUID, JSONB, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_india_post_tariff_rates_transactional(UUID, JSONB, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.import_india_post_tariff_rates_transactional(UUID, JSONB, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.import_india_post_tariff_rates_transactional(UUID, JSONB, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.import_india_post_pincodes_transactional(JSONB, TEXT, BOOLEAN, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_india_post_pincodes_transactional(JSONB, TEXT, BOOLEAN, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.import_india_post_pincodes_transactional(JSONB, TEXT, BOOLEAN, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.import_india_post_pincodes_transactional(JSONB, TEXT, BOOLEAN, UUID, TEXT) TO service_role;
