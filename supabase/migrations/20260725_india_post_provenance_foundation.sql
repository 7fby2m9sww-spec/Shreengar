-- Migration: India Post Provenance Foundation (Step 3B Safety Audit Corrected)
-- File: supabase/migrations/20260725_india_post_provenance_foundation.sql
-- Description: Additive schema for source documents, tariff evidence, pincode import batches, immutable pincode entry audit history, and transactional tariff verification RPC.

-- =========================================================================
-- 1. Shipping Source Documents Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.shipping_source_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL CONSTRAINT chk_source_docs_type CHECK (document_type IN ('tariff_schedule', 'tax_notification', 'pincode_directory', 'jurisdiction_definition')),
    title TEXT NOT NULL CONSTRAINT chk_source_docs_title CHECK (trim(title) <> ''),
    authority TEXT NOT NULL DEFAULT 'Department of Posts, Ministry of Communications' CONSTRAINT chk_source_docs_authority CHECK (trim(authority) <> ''),
    exact_source_url TEXT,
    stored_file_reference TEXT,
    official_document_number TEXT,
    source_accessed_at DATE,
    source_document_date DATE NOT NULL,
    file_hash TEXT,
    verification_status TEXT NOT NULL DEFAULT 'unverified' CONSTRAINT chk_source_docs_status CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
    verification_notes TEXT,
    verified_by_auth_user_id UUID,
    verified_by_email VARCHAR(255),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Note: Detailed validation of URL format/domain (e.g. rejecting generic homepages) is enforced at the server-level prior to storage; database guarantees non-blank locator presence.
    CONSTRAINT chk_source_docs_locator CHECK (
        (exact_source_url IS NOT NULL AND trim(exact_source_url) <> '') OR
        (stored_file_reference IS NOT NULL AND trim(stored_file_reference) <> '') OR
        (official_document_number IS NOT NULL AND trim(official_document_number) <> '')
    ),
    CONSTRAINT chk_source_docs_file_hash CHECK (
        stored_file_reference IS NULL OR (file_hash IS NOT NULL AND trim(file_hash) <> '')
    ),
    CONSTRAINT chk_source_docs_unverified_fields CHECK (
        verification_status <> 'unverified' OR (verified_by_auth_user_id IS NULL AND verified_by_email IS NULL AND verified_at IS NULL)
    ),
    CONSTRAINT chk_source_docs_verified_fields CHECK (
        verification_status <> 'verified' OR (verified_by_auth_user_id IS NOT NULL AND verified_by_email IS NOT NULL AND trim(verified_by_email) <> '' AND verified_at IS NOT NULL)
    ),
    CONSTRAINT chk_source_docs_rejected_fields CHECK (
        verification_status <> 'rejected' OR (verified_by_auth_user_id IS NOT NULL AND verified_by_email IS NOT NULL AND trim(verified_by_email) <> '' AND verified_at IS NOT NULL AND verification_notes IS NOT NULL AND trim(verification_notes) <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_source_docs_type ON public.shipping_source_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_source_docs_status ON public.shipping_source_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_source_docs_date ON public.shipping_source_documents(source_document_date);
CREATE INDEX IF NOT EXISTS idx_source_docs_url ON public.shipping_source_documents(exact_source_url) WHERE (exact_source_url IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_source_docs_doc_num ON public.shipping_source_documents(official_document_number) WHERE (official_document_number IS NOT NULL);

-- =========================================================================
-- 2. India Post Tariff Version Evidence Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.india_post_tariff_version_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tariff_version_id UUID NOT NULL REFERENCES public.india_post_tariff_versions(id) ON DELETE CASCADE,
    source_document_id UUID NOT NULL REFERENCES public.shipping_source_documents(id) ON DELETE RESTRICT,
    evidence_role TEXT NOT NULL CONSTRAINT chk_tariff_ev_role CHECK (evidence_role IN ('tariff_schedule', 'tax_notification')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    linked_by_auth_user_id UUID NOT NULL,
    linked_by_email VARCHAR(255) NOT NULL CONSTRAINT chk_tariff_ev_linked_email CHECK (trim(linked_by_email) <> ''),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT idx_unique_tariff_version_evidence_role UNIQUE (tariff_version_id, source_document_id, evidence_role)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_primary_tariff_version_evidence 
ON public.india_post_tariff_version_evidence (tariff_version_id, evidence_role) 
WHERE (is_primary = true);

CREATE INDEX IF NOT EXISTS idx_tariff_version_evidence_v_id ON public.india_post_tariff_version_evidence(tariff_version_id);
CREATE INDEX IF NOT EXISTS idx_tariff_version_evidence_doc_id ON public.india_post_tariff_version_evidence(source_document_id);

-- Evidence Role Trigger Function
CREATE OR REPLACE FUNCTION public.fn_check_tariff_evidence_role_compatibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_doc_type TEXT;
BEGIN
    SELECT document_type INTO v_doc_type
    FROM public.shipping_source_documents
    WHERE id = NEW.source_document_id;

    IF v_doc_type IS NULL OR v_doc_type <> NEW.evidence_role THEN
        RAISE EXCEPTION 'SHIPPING_EVIDENCE_ROLE_MISMATCH';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_tariff_evidence_role_compatibility ON public.india_post_tariff_version_evidence;
CREATE TRIGGER trg_check_tariff_evidence_role_compatibility
BEFORE INSERT OR UPDATE ON public.india_post_tariff_version_evidence
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_tariff_evidence_role_compatibility();

-- =========================================================================
-- 3. Shipping Pincode Import Batches Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.shipping_pincode_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_version TEXT CONSTRAINT chk_pincode_batch_dataset_ver CHECK (dataset_version IS NULL OR trim(dataset_version) <> ''),
    replace_mode BOOLEAN NOT NULL DEFAULT false,
    imported_by_auth_user_id UUID NOT NULL,
    imported_by_email VARCHAR(255) NOT NULL CONSTRAINT chk_pincode_batch_imp_email CHECK (trim(imported_by_email) <> ''),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_input_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_pincode_batch_tot_cnt CHECK (total_input_count >= 0),
    inserted_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_pincode_batch_ins_cnt CHECK (inserted_count >= 0),
    updated_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_pincode_batch_upd_cnt CHECK (updated_count >= 0),
    skipped_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_pincode_batch_skp_cnt CHECK (skipped_count >= 0),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CONSTRAINT chk_pincode_batch_status CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
    verification_notes TEXT,
    verified_by_auth_user_id UUID,
    verified_by_email VARCHAR(255),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pincode_batch_counts_sum CHECK (total_input_count = inserted_count + updated_count + skipped_count),
    CONSTRAINT chk_pincode_batch_unverified_fields CHECK (
        verification_status <> 'unverified' OR (verified_by_auth_user_id IS NULL AND verified_by_email IS NULL AND verified_at IS NULL)
    ),
    CONSTRAINT chk_pincode_batch_verified_fields CHECK (
        verification_status <> 'verified' OR (verified_by_auth_user_id IS NOT NULL AND verified_by_email IS NOT NULL AND trim(verified_by_email) <> '' AND verified_at IS NOT NULL)
    ),
    CONSTRAINT chk_pincode_batch_rejected_fields CHECK (
        verification_status <> 'rejected' OR (verified_by_auth_user_id IS NOT NULL AND verified_by_email IS NOT NULL AND trim(verified_by_email) <> '' AND verified_at IS NOT NULL AND verification_notes IS NOT NULL AND trim(verification_notes) <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_pincode_batches_status ON public.shipping_pincode_import_batches(verification_status);
CREATE INDEX IF NOT EXISTS idx_pincode_batches_imported_at ON public.shipping_pincode_import_batches(imported_at);

-- =========================================================================
-- 4. Shipping Pincode Batch Evidence Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.shipping_pincode_batch_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL REFERENCES public.shipping_pincode_import_batches(id) ON DELETE CASCADE,
    source_document_id UUID NOT NULL REFERENCES public.shipping_source_documents(id) ON DELETE RESTRICT,
    evidence_role TEXT NOT NULL CONSTRAINT chk_pincode_batch_ev_role CHECK (evidence_role IN ('pincode_directory', 'jurisdiction_definition')),
    linked_by_auth_user_id UUID NOT NULL,
    linked_by_email VARCHAR(255) NOT NULL CONSTRAINT chk_pincode_batch_ev_linked_email CHECK (trim(linked_by_email) <> ''),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT idx_unique_pincode_batch_evidence_role UNIQUE (import_batch_id, source_document_id, evidence_role)
);

CREATE INDEX IF NOT EXISTS idx_pincode_batch_evidence_b_id ON public.shipping_pincode_batch_evidence(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_pincode_batch_evidence_doc_id ON public.shipping_pincode_batch_evidence(source_document_id);

-- Pincode Batch Evidence Role Trigger Function
CREATE OR REPLACE FUNCTION public.fn_check_pincode_batch_evidence_role_compatibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_doc_type TEXT;
BEGIN
    SELECT document_type INTO v_doc_type
    FROM public.shipping_source_documents
    WHERE id = NEW.source_document_id;

    IF v_doc_type IS NULL OR v_doc_type <> NEW.evidence_role THEN
        RAISE EXCEPTION 'SHIPPING_EVIDENCE_ROLE_MISMATCH';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_pincode_batch_evidence_role_compatibility ON public.shipping_pincode_batch_evidence;
CREATE TRIGGER trg_check_pincode_batch_evidence_role_compatibility
BEFORE INSERT OR UPDATE ON public.shipping_pincode_batch_evidence
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_pincode_batch_evidence_role_compatibility();

-- =========================================================================
-- 5. India Post Pincode Import Entries Table (Truly Immutable History)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.india_post_pincode_import_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL REFERENCES public.shipping_pincode_import_batches(id) ON DELETE RESTRICT,
    pincode VARCHAR(6) NOT NULL CONSTRAINT chk_pincode_entry_six_digits CHECK (pincode ~ '^[0-9]{6}$'),
    operation TEXT NOT NULL CONSTRAINT chk_pincode_entry_op CHECK (operation IN ('inserted', 'updated', 'skipped')),
    previous_snapshot JSONB,
    new_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pincode_entry_ins_snapshot CHECK (operation <> 'inserted' OR new_snapshot IS NOT NULL),
    CONSTRAINT chk_pincode_entry_upd_snapshot CHECK (operation <> 'updated' OR (previous_snapshot IS NOT NULL AND new_snapshot IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_pincode_import_entries_b_id ON public.india_post_pincode_import_entries(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_pincode_import_entries_pincode ON public.india_post_pincode_import_entries(pincode);
CREATE INDEX IF NOT EXISTS idx_pincode_import_entries_b_id_op ON public.india_post_pincode_import_entries(import_batch_id, operation);

-- Trigger to enforce strict immutability (blocks UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.fn_prevent_pincode_import_entries_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'SHIPPING_PINCODE_HISTORY_IMMUTABLE';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_pincode_import_entries_mutation ON public.india_post_pincode_import_entries;
CREATE TRIGGER trg_prevent_pincode_import_entries_mutation
BEFORE UPDATE OR DELETE ON public.india_post_pincode_import_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_pincode_import_entries_mutation();

-- Lineage pointer column on live pincode table
ALTER TABLE public.india_post_pincodes
ADD COLUMN IF NOT EXISTS last_import_batch_id UUID REFERENCES public.shipping_pincode_import_batches(id) ON DELETE RESTRICT;

-- =========================================================================
-- 6. Transactional Tariff Verification RPC Function
-- =========================================================================
DROP FUNCTION IF EXISTS public.verify_india_post_tariff_version_transactional(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.verify_india_post_tariff_version_transactional(UUID, UUID);

CREATE OR REPLACE FUNCTION public.verify_india_post_tariff_version_transactional(
    p_tariff_version_id UUID,
    p_admin_auth_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ver RECORD;
    v_canonical_admin_email VARCHAR(255);
    v_rates_count INT;
    v_unsupported_services INT;
    v_unsupported_zones INT;
    v_missing_zone TEXT;
    v_unresolved_tax INT;
    v_invalid_slab INT;
    v_overlaps INT;
    v_tariff_sched_primary_count INT;
    v_tax_notif_count INT;
    v_mismatched_role_count INT;
    v_unverified_ev_count INT;
    v_primary_doc RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Validate Admin identity against database
    IF p_admin_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'SHIPPING_ADMIN_UNAUTHORIZED';
    END IF;

    SELECT email INTO v_canonical_admin_email
    FROM public.admin_users
    WHERE user_id = p_admin_auth_user_id AND is_active = true;

    IF NOT FOUND OR v_canonical_admin_email IS NULL OR trim(v_canonical_admin_email) = '' THEN
        RAISE EXCEPTION 'SHIPPING_ADMIN_UNAUTHORIZED';
    END IF;

    -- 2. Lock target version row
    SELECT * INTO v_ver
    FROM public.india_post_tariff_versions
    WHERE id = p_tariff_version_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SHIPPING_TARIFF_NOT_FOUND';
    END IF;

    IF v_ver.is_archived = true THEN
        RAISE EXCEPTION 'SHIPPING_TARIFF_INCOMPLETE';
    END IF;

    -- Reject active but unverified/inconsistent tariff
    IF v_ver.is_active = true AND v_ver.verified_at IS NULL THEN
        RAISE EXCEPTION 'SHIPPING_ACTIVE_TARIFF_INVALID';
    END IF;

    -- 3. Verify rate presence for speed_post_parcel_domestic
    SELECT COUNT(*) INTO v_rates_count
    FROM public.india_post_tariff_rates
    WHERE tariff_version_id = p_tariff_version_id AND service_code = 'speed_post_parcel_domestic';

    IF v_rates_count = 0 THEN
        RAISE EXCEPTION 'SHIPPING_TARIFF_INCOMPLETE';
    END IF;

    -- Reject unsupported service codes
    SELECT COUNT(*) INTO v_unsupported_services
    FROM public.india_post_tariff_rates
    WHERE tariff_version_id = p_tariff_version_id AND service_code IS DISTINCT FROM 'speed_post_parcel_domestic';

    IF v_unsupported_services > 0 THEN
        RAISE EXCEPTION 'SHIPPING_UNSUPPORTED_SERVICE_CODE';
    END IF;

    -- Reject unsupported destination zones (including NULL)
    SELECT COUNT(*) INTO v_unsupported_zones
    FROM public.india_post_tariff_rates
    WHERE tariff_version_id = p_tariff_version_id
      AND (destination_zone_code IS NULL OR destination_zone_code NOT IN ('local', 'up_to_200_km', '201_to_1000_km', '1001_to_2000_km', 'above_2000_km'));

    IF v_unsupported_zones > 0 THEN
        RAISE EXCEPTION 'SHIPPING_UNSUPPORTED_ZONE';
    END IF;

    -- 4. Verify canonical distance zones presence
    SELECT zone_code INTO v_missing_zone
    FROM (VALUES ('local'), ('up_to_200_km'), ('201_to_1000_km'), ('1001_to_2000_km'), ('above_2000_km')) AS required(zone_code)
    WHERE zone_code NOT IN (
        SELECT DISTINCT destination_zone_code
        FROM public.india_post_tariff_rates
        WHERE tariff_version_id = p_tariff_version_id AND service_code = 'speed_post_parcel_domestic'
    )
    LIMIT 1;

    IF v_missing_zone IS NOT NULL THEN
        RAISE EXCEPTION 'SHIPPING_TARIFF_INCOMPLETE';
    END IF;

    -- 5. Verify no NULL tax_rate_basis_points
    SELECT COUNT(*) INTO v_unresolved_tax
    FROM public.india_post_tariff_rates
    WHERE tariff_version_id = p_tariff_version_id AND service_code = 'speed_post_parcel_domestic' AND tax_rate_basis_points IS NULL;

    IF v_unresolved_tax > 0 THEN
        RAISE EXCEPTION 'SHIPPING_TAX_UNRESOLVED';
    END IF;

    -- 6. Verify non-negative weights, rates, surcharges & valid slab bounds (Explicitly rejecting NULLs in mandatory fields)
    SELECT COUNT(*) INTO v_invalid_slab
    FROM public.india_post_tariff_rates
    WHERE tariff_version_id = p_tariff_version_id 
      AND (
        min_weight_grams IS NULL OR
        max_weight_grams IS NULL OR
        base_weight_grams IS NULL OR
        additional_slab_grams IS NULL OR
        base_rate_paise IS NULL OR
        additional_slab_rate_paise IS NULL OR
        tax_rate_basis_points IS NULL OR
        min_weight_grams < 0 OR
        max_weight_grams < min_weight_grams OR
        base_weight_grams < 0 OR
        additional_slab_grams < 0 OR
        base_rate_paise < 0 OR
        additional_slab_rate_paise < 0 OR
        (remote_surcharge_paise IS NOT NULL AND remote_surcharge_paise < 0)
      );

    IF v_invalid_slab > 0 THEN
        RAISE EXCEPTION 'SHIPPING_TARIFF_INCOMPLETE';
    END IF;

    -- 7. Verify zero duplicate or overlapping slabs
    SELECT COUNT(*) INTO v_overlaps
    FROM public.india_post_tariff_rates r1
    JOIN public.india_post_tariff_rates r2
      ON r1.tariff_version_id = r2.tariff_version_id
     AND r1.destination_zone_code = r2.destination_zone_code
     AND r1.service_code = r2.service_code
     AND r1.id <> r2.id
     AND r1.min_weight_grams <= r2.max_weight_grams
     AND r1.max_weight_grams >= r2.min_weight_grams
    WHERE r1.tariff_version_id = p_tariff_version_id;

    IF v_overlaps > 0 THEN
        RAISE EXCEPTION 'SHIPPING_TARIFF_INCOMPLETE';
    END IF;

    -- 8. Verify deterministic evidence links
    SELECT COUNT(*) INTO v_tariff_sched_primary_count
    FROM public.india_post_tariff_version_evidence e
    JOIN public.shipping_source_documents d ON e.source_document_id = d.id
    WHERE e.tariff_version_id = p_tariff_version_id
      AND e.evidence_role = 'tariff_schedule'
      AND e.is_primary = true
      AND d.document_type = 'tariff_schedule'
      AND d.verification_status = 'verified';

    IF v_tariff_sched_primary_count <> 1 THEN
        IF v_tariff_sched_primary_count = 0 THEN
            RAISE EXCEPTION 'SHIPPING_TARIFF_EVIDENCE_MISSING';
        ELSE
            RAISE EXCEPTION 'SHIPPING_AMBIGUOUS_PRIMARY_EVIDENCE';
        END IF;
    END IF;

    SELECT COUNT(*) INTO v_tax_notif_count
    FROM public.india_post_tariff_version_evidence e
    JOIN public.shipping_source_documents d ON e.source_document_id = d.id
    WHERE e.tariff_version_id = p_tariff_version_id
      AND e.evidence_role = 'tax_notification'
      AND d.document_type = 'tax_notification'
      AND d.verification_status = 'verified';

    IF v_tax_notif_count = 0 THEN
        RAISE EXCEPTION 'SHIPPING_TAX_EVIDENCE_MISSING';
    END IF;

    -- Verify no role mismatches or unverified evidence links
    SELECT COUNT(*) INTO v_mismatched_role_count
    FROM public.india_post_tariff_version_evidence e
    JOIN public.shipping_source_documents d ON e.source_document_id = d.id
    WHERE e.tariff_version_id = p_tariff_version_id AND e.evidence_role <> d.document_type;

    IF v_mismatched_role_count > 0 THEN
        RAISE EXCEPTION 'SHIPPING_EVIDENCE_ROLE_MISMATCH';
    END IF;

    SELECT COUNT(*) INTO v_unverified_ev_count
    FROM public.india_post_tariff_version_evidence e
    JOIN public.shipping_source_documents d ON e.source_document_id = d.id
    WHERE e.tariff_version_id = p_tariff_version_id AND d.verification_status <> 'verified';

    IF v_unverified_ev_count > 0 THEN
        RAISE EXCEPTION 'SHIPPING_TARIFF_EVIDENCE_MISSING';
    END IF;

    -- 9. Get primary doc for compatibility field population
    SELECT d.title, d.source_document_date INTO v_primary_doc
    FROM public.india_post_tariff_version_evidence e
    JOIN public.shipping_source_documents d ON e.source_document_id = d.id
    WHERE e.tariff_version_id = p_tariff_version_id 
      AND e.evidence_role = 'tariff_schedule'
      AND e.is_primary = true
    LIMIT 1;

    -- Idempotent check for already verified version (only after all validation checks pass)
    IF v_ver.verified_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_verified', true,
            'version_id', p_tariff_version_id,
            'verified_by', v_ver.verified_by,
            'verified_at', v_ver.verified_at
        );
    END IF;

    -- 10. Update tariff version verification status (Leaves is_active = false)
    UPDATE public.india_post_tariff_versions
    SET source_reference = v_primary_doc.title,
        source_document_date = v_primary_doc.source_document_date,
        verified_by = p_admin_auth_user_id,
        verified_at = v_now,
        is_archived = false,
        updated_at = v_now
    WHERE id = p_tariff_version_id;

    -- 11. Insert activity log entry in the same transaction using canonical email
    INSERT INTO public.activity_logs (
        user_id,
        user_email,
        action,
        module,
        details,
        created_at
    ) VALUES (
        p_admin_auth_user_id,
        v_canonical_admin_email,
        'shipping.tariff_version_verified',
        'shipping',
        jsonb_build_object(
            'id', p_tariff_version_id,
            'name', v_ver.name,
            'verified_by_auth_user_id', p_admin_auth_user_id,
            'verified_by_email', v_canonical_admin_email
        ),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'version_id', p_tariff_version_id,
        'verified_by', p_admin_auth_user_id,
        'verified_at', v_now
    );
END;
$$;

-- Revoke permissions from PUBLIC/anon/authenticated and grant to service_role
REVOKE ALL ON FUNCTION public.verify_india_post_tariff_version_transactional(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_india_post_tariff_version_transactional(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.verify_india_post_tariff_version_transactional(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_india_post_tariff_version_transactional(UUID, UUID) TO service_role;

-- Revoke permissions on helper functions to lock them down (no public/anon/authenticated execution, owner-only)
REVOKE ALL ON FUNCTION public.fn_prevent_pincode_import_entries_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_tariff_evidence_role_compatibility() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_pincode_batch_evidence_role_compatibility() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 7. Table-Specific Grants & RLS Activation
-- =========================================================================
ALTER TABLE public.shipping_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.india_post_tariff_version_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_pincode_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_pincode_batch_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.india_post_pincode_import_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shipping_source_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.india_post_tariff_version_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.shipping_pincode_import_batches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.shipping_pincode_batch_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.india_post_pincode_import_entries FROM PUBLIC, anon, authenticated;

-- Precise table-specific service_role grants (No UPDATE or DELETE on immutable entries)
GRANT SELECT, INSERT, UPDATE ON public.shipping_source_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.india_post_tariff_version_evidence TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.shipping_pincode_import_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_pincode_batch_evidence TO service_role;
GRANT SELECT, INSERT ON public.india_post_pincode_import_entries TO service_role;
