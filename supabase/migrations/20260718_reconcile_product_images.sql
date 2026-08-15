-- Migration: 20260718_reconcile_product_images.sql
-- Description: Fully qualified, robust PostgreSQL RPC for atomic product image reconciliation with complete partition accounting.

CREATE OR REPLACE FUNCTION public.reconcile_product_images(
  p_product_id UUID,
  p_retained_images JSONB,
  p_new_images JSONB,
  p_removed_ids UUID[]
) RETURNS SETOF public.product_images
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_db_ids UUID[] := ARRAY[]::UUID[];
  v_removed_ids UUID[];
  v_retained_ids UUID[] := ARRAY[]::UUID[];
  v_display_orders INT[] := ARRAY[]::INT[];
  v_retained JSONB;
  v_new JSONB;
  v_id UUID;
  v_order INT;
  v_primary_count INTEGER;
  v_img_count INTEGER;
BEGIN
  -- Safe default for null arrays
  v_removed_ids := COALESCE(p_removed_ids, ARRAY[]::UUID[]);

  -- 1. Verify product exists
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product % does not exist', p_product_id;
  END IF;

  -- 2. Fetch all existing image IDs for this product
  SELECT array_agg(id) INTO v_db_ids
  FROM public.product_images
  WHERE product_id = p_product_id;
  v_db_ids := COALESCE(v_db_ids, ARRAY[]::UUID[]);

  -- 3. Extract and validate removed IDs
  IF array_length(v_removed_ids, 1) > 0 THEN
    FOREACH v_id IN ARRAY v_removed_ids
    LOOP
      -- Verify it exists and belongs to the product
      IF NOT (v_id = ANY(v_db_ids)) THEN
        RAISE EXCEPTION 'Removed image ID % does not belong to product %', v_id, p_product_id;
      END IF;

      -- Reject duplicate removed IDs
      IF (SELECT COUNT(*) FROM unnest(v_removed_ids) x WHERE x = v_id) > 1 THEN
        RAISE EXCEPTION 'Duplicate ID found in removed list: %', v_id;
      END IF;
    END LOOP;
  END IF;

  -- 4. Extract and validate retained images
  IF p_retained_images IS NOT NULL AND jsonb_array_length(p_retained_images) > 0 THEN
    FOR v_retained IN SELECT * FROM jsonb_array_elements(p_retained_images)
    LOOP
      -- Reject malformed JSON objects
      IF NOT (v_retained ? 'id' AND v_retained ? 'display_order' AND v_retained ? 'is_primary') THEN
        RAISE EXCEPTION 'Malformed JSON object in retained list';
      END IF;

      v_id := (v_retained->>'id')::uuid;
      v_order := (v_retained->>'display_order')::integer;

      -- Verify it exists and belongs to the product
      IF NOT (v_id = ANY(v_db_ids)) THEN
        RAISE EXCEPTION 'Retained image ID % does not belong to product %', v_id, p_product_id;
      END IF;

      -- Reject duplicate retained IDs
      IF v_id = ANY(v_retained_ids) THEN
        RAISE EXCEPTION 'Duplicate ID found in retained list: %', v_id;
      END IF;
      v_retained_ids := array_append(v_retained_ids, v_id);

      -- Reject ID appearing in both lists
      IF v_id = ANY(v_removed_ids) THEN
        RAISE EXCEPTION 'ID % cannot be in both retained and removed lists', v_id;
      END IF;

      -- Validate display order
      IF v_order < 0 THEN
        RAISE EXCEPTION 'Display order cannot be negative: %', v_order;
      END IF;

      IF v_order = ANY(v_display_orders) THEN
        RAISE EXCEPTION 'Duplicate display order detected: %', v_order;
      END IF;
      v_display_orders := array_append(v_display_orders, v_order);
    END LOOP;
  END IF;

  -- 5. Complete partition accounting check: Every DB image must be either retained or removed
  IF array_length(v_db_ids, 1) > 0 THEN
    FOREACH v_id IN ARRAY v_db_ids
    LOOP
      IF NOT (v_id = ANY(v_retained_ids) OR v_id = ANY(v_removed_ids)) THEN
        RAISE EXCEPTION 'Existing image ID % is missing from both retained and removed lists', v_id;
      END IF;
    END LOOP;
  END IF;

  -- 6. Validate new images
  IF p_new_images IS NOT NULL AND jsonb_array_length(p_new_images) > 0 THEN
    FOR v_new IN SELECT * FROM jsonb_array_elements(p_new_images)
    LOOP
      -- Reject malformed JSON objects
      IF NOT (v_new ? 'image_url' AND v_new ? 'storage_path' AND v_new ? 'display_order' AND v_new ? 'is_primary') THEN
        RAISE EXCEPTION 'Malformed JSON object in new images list';
      END IF;

      -- Validate blank or invalid URLs/paths
      IF trim(v_new->>'image_url') = '' THEN
        RAISE EXCEPTION 'New image URL cannot be blank';
      END IF;
      IF trim(v_new->>'storage_path') = '' THEN
        RAISE EXCEPTION 'New image storage path cannot be blank';
      END IF;

      v_order := (v_new->>'display_order')::integer;

      -- Check display order validity
      IF v_order < 0 THEN
        RAISE EXCEPTION 'Display order cannot be negative: %', v_order;
      END IF;

      IF v_order = ANY(v_display_orders) THEN
        RAISE EXCEPTION 'Duplicate display order detected: %', v_order;
      END IF;
      v_display_orders := array_append(v_display_orders, v_order);
    END LOOP;
  END IF;

  -- 6.5. Clear existing primary flag temporarily to avoid unique index conflicts
  UPDATE public.product_images
  SET
    is_primary = false,
    updated_at = NOW()
  WHERE product_id = p_product_id
    AND is_primary = true;

  -- 7. Perform deletions
  IF array_length(v_removed_ids, 1) > 0 THEN
    DELETE FROM public.product_images
    WHERE product_id = p_product_id AND id = ANY(v_removed_ids);
  END IF;

  -- 8. Perform updates in-place
  IF p_retained_images IS NOT NULL AND jsonb_array_length(p_retained_images) > 0 THEN
    FOR v_retained IN SELECT * FROM jsonb_array_elements(p_retained_images)
    LOOP
      UPDATE public.product_images
      SET
        display_order = (v_retained->>'display_order')::integer,
        is_primary = (v_retained->>'is_primary')::boolean,
        alt_text = v_retained->>'alt_text',
        updated_at = NOW()
      WHERE id = (v_retained->>'id')::uuid AND product_id = p_product_id;
    END LOOP;
  END IF;

  -- 9. Perform inserts
  IF p_new_images IS NOT NULL AND jsonb_array_length(p_new_images) > 0 THEN
    INSERT INTO public.product_images (product_id, image_url, storage_path, display_order, is_primary, alt_text)
    SELECT
      p_product_id,
      new_img->>'image_url',
      new_img->>'storage_path',
      (new_img->>'display_order')::integer,
      (new_img->>'is_primary')::boolean,
      new_img->>'alt_text'
    FROM jsonb_array_elements(p_new_images) AS new_img;
  END IF;

  -- 10. Contiguous display_order indexing from 0
  WITH ordered_images AS (
    SELECT id, ROW_NUMBER() OVER(ORDER BY display_order ASC, created_at ASC) - 1 as new_order
    FROM public.product_images
    WHERE product_id = p_product_id
  )
  UPDATE public.product_images
  SET display_order = ordered_images.new_order
  FROM ordered_images
  WHERE public.product_images.id = ordered_images.id;

  -- 11. Enforce primary count rules
  SELECT COUNT(*) INTO v_img_count FROM public.product_images WHERE product_id = p_product_id;
  
  IF v_img_count > 0 THEN
    SELECT COUNT(*) INTO v_primary_count FROM public.product_images WHERE product_id = p_product_id AND is_primary = true;
    IF v_primary_count != 1 THEN
      RAISE EXCEPTION 'Exactly one image must be marked as primary (found %)', v_primary_count;
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_primary_count FROM public.product_images WHERE product_id = p_product_id AND is_primary = true;
    IF v_primary_count > 0 THEN
      RAISE EXCEPTION 'No primary image can exist when there are zero images';
    END IF;
  END IF;

  -- Return final rows ordered by display_order
  RETURN QUERY
  SELECT * FROM public.product_images
  WHERE product_id = p_product_id
  ORDER BY display_order ASC;
END;
$$;

-- Correct function grants using full signature
REVOKE EXECUTE ON FUNCTION public.reconcile_product_images(
  UUID,
  JSONB,
  JSONB,
  UUID[]
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reconcile_product_images(
  UUID,
  JSONB,
  JSONB,
  UUID[]
) TO service_role;
