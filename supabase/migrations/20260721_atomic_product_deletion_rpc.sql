-- Migration: Atomic Product Deletion / Safe Archiving RPC
-- Description: Provides atomic product deletion or order-history archiving inside one single database transaction.

CREATE OR REPLACE FUNCTION delete_product_safely(target_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_count INT := 0;
    v_variant_ids UUID[];
BEGIN
    -- 1. Verify product exists
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = target_product_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Product record not found.'
        );
    END IF;

    -- 2. Collect variant IDs
    SELECT ARRAY_AGG(id) INTO v_variant_ids
    FROM public.product_variants
    WHERE product_id = target_product_id;

    -- 3. Check order_items for direct product reference or variant references
    SELECT COUNT(*) INTO v_order_count
    FROM public.order_items
    WHERE product_id = target_product_id
       OR (v_variant_ids IS NOT NULL AND variant_id = ANY(v_variant_ids));

    -- 4. If order history exists, ARCHIVE product safely (do NOT hard-delete)
    IF v_order_count > 0 THEN
        UPDATE public.products
        SET is_active = false,
            updated_at = NOW()
        WHERE id = target_product_id;

        RETURN jsonb_build_object(
            'success', true,
            'is_archived', true,
            'message', 'This product is linked to existing customer orders and cannot be permanently deleted. It has been archived instead.'
        );
    END IF;

    -- 5. Hard delete non-historical dependent rows atomically
    IF v_variant_ids IS NOT NULL AND ARRAY_LENGTH(v_variant_ids, 1) > 0 THEN
        DELETE FROM public.inventory WHERE variant_id = ANY(v_variant_ids);
        DELETE FROM public.cart_items WHERE variant_id = ANY(v_variant_ids);
    END IF;

    DELETE FROM public.cart_items WHERE product_id = target_product_id;
    DELETE FROM public.wishlist WHERE product_id = target_product_id;
    DELETE FROM public.reviews WHERE product_id = target_product_id;
    DELETE FROM public.product_images WHERE product_id = target_product_id;
    DELETE FROM public.product_variants WHERE product_id = target_product_id;
    DELETE FROM public.products WHERE id = target_product_id;

    RETURN jsonb_build_object(
        'success', true,
        'is_archived', false,
        'message', 'Product and associated records permanently deleted.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
