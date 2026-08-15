-- Migration: Add Product Families, Colourway Grouping, and Production RPC
-- File: supabase/migrations/20260720213000_product_colourway_groups.sql
-- Date: 2026-07-20

-- 1. Create product_families table
CREATE TABLE IF NOT EXISTS public.product_families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    internal_reference TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on product_families
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;

-- 2. Add columns to products table safely if they do not exist
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_family_id UUID REFERENCES public.product_families(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS primary_color_id UUID REFERENCES public.colors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS colorway_sort_order INTEGER NOT NULL DEFAULT 0;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_product_family_id ON public.products(product_family_id);
CREATE INDEX IF NOT EXISTS idx_products_primary_color_id ON public.products(primary_color_id);
CREATE INDEX IF NOT EXISTS idx_products_colorway_sort_order ON public.products(colorway_sort_order);

-- 4. Unique partial index to prevent duplicate active primary colours in the same family
CREATE UNIQUE INDEX IF NOT EXISTS products_family_primary_color_unique
ON public.products(product_family_id, primary_color_id)
WHERE product_family_id IS NOT NULL AND primary_color_id IS NOT NULL AND is_active = true;

-- 5. Security RLS Policies for product_families
DROP POLICY IF EXISTS "Public Read Product Families" ON public.product_families;
DROP POLICY IF EXISTS "Staff Modify Product Families" ON public.product_families;

CREATE POLICY "Public Read Product Families" ON public.product_families FOR SELECT USING (is_active = true OR public.is_admin_user());
CREATE POLICY "Staff Modify Product Families" ON public.product_families FOR ALL USING (public.is_admin_user());

-- 6. Safe Public View for Product Families (Excluding Admin internal_reference)
CREATE OR REPLACE VIEW public.product_families_public AS
SELECT id, name, category_id, is_active, created_at, updated_at
FROM public.product_families
WHERE is_active = true;

-- 7. Atomic Colourway Creation RPC
CREATE OR REPLACE FUNCTION public.create_product_colourway_atomic(
    p_source_product_id UUID,
    p_primary_color_id UUID,
    p_color_name TEXT DEFAULT NULL,
    p_title TEXT DEFAULT NULL,
    p_sku_prefix TEXT DEFAULT NULL,
    p_copy_images BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    family_id UUID,
    new_product_id UUID,
    new_product_slug TEXT,
    new_product_sku TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_src products%ROWTYPE;
    v_color colors%ROWTYPE;
    v_family_id UUID;
    v_clean_title TEXT;
    v_base_slug TEXT;
    v_target_slug TEXT;
    v_target_sku TEXT;
    v_slug_counter INT := 1;
    v_sku_counter INT := 1;
    v_var_sku_counter INT;
    v_new_product_id UUID;
    v_size_rec RECORD;
    v_new_variant_id UUID;
    v_var_sku TEXT;
    v_color_name_final TEXT;
    v_img RECORD;
BEGIN
    -- 1. Validate source product
    SELECT * INTO v_src FROM public.products WHERE id = p_source_product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source product % not found.', p_source_product_id;
    END IF;

    -- 2. Validate primary colour
    SELECT * INTO v_color FROM public.colors WHERE id = p_primary_color_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Primary colour % not found.', p_primary_color_id;
    END IF;
    v_color_name_final := COALESCE(NULLIF(TRIM(p_color_name), ''), v_color.name, 'New Colour');

    -- 3. Resolve or Create Product Family Atomically
    IF v_src.product_family_id IS NOT NULL THEN
        v_family_id := v_src.product_family_id;

        -- Validate Category Matching if Family Has Category Assigned
        IF EXISTS (
            SELECT 1 FROM public.product_families 
            WHERE id = v_family_id AND category_id IS NOT NULL AND category_id != v_src.category_id
        ) THEN
            RAISE EXCEPTION 'This product category does not match the selected product family.';
        END IF;

        -- If family category is null, establish it from source product category
        UPDATE public.product_families
        SET category_id = v_src.category_id, updated_at = NOW()
        WHERE id = v_family_id AND category_id IS NULL;
    ELSE
        -- Atomically create a new product_families row for ungrouped source product
        INSERT INTO public.product_families (
            name,
            category_id,
            internal_reference,
            is_active
        ) VALUES (
            v_src.title,
            v_src.category_id,
            'Auto-created for ' || v_src.sku,
            true
        ) RETURNING id INTO v_family_id;

        -- Assign source product to the newly created family
        UPDATE public.products
        SET product_family_id = v_family_id, updated_at = NOW()
        WHERE id = p_source_product_id;
    END IF;

    -- 4. Prevent duplicate active primary colour in same product family
    IF EXISTS (
        SELECT 1 FROM public.products 
        WHERE product_family_id = v_family_id 
          AND primary_color_id = p_primary_color_id 
          AND is_active = true 
          AND id != p_source_product_id
    ) THEN
        RAISE EXCEPTION 'Another active product in this family already uses primary colour %.', v_color_name_final;
    END IF;

    -- 5. Generate collision-safe title, slug and SKU
    v_clean_title := COALESCE(NULLIF(TRIM(p_title), ''), v_src.title || ' - ' || v_color_name_final);
    v_base_slug := lower(regexp_replace(v_clean_title, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := regexp_replace(v_base_slug, '(^-|-$)', '', 'g');
    
    v_target_slug := v_base_slug;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = v_target_slug) AND v_slug_counter <= 100 LOOP
        v_target_slug := v_base_slug || '-' || v_slug_counter;
        v_slug_counter := v_slug_counter + 1;
    END LOOP;

    v_target_sku := COALESCE(NULLIF(TRIM(p_sku_prefix), ''), v_src.sku || '-' || upper(substring(v_color_name_final from 1 for 3)));
    WHILE EXISTS (SELECT 1 FROM public.products WHERE sku = v_target_sku) AND v_sku_counter <= 100 LOOP
        v_target_sku := v_src.sku || '-' || upper(substring(v_color_name_final from 1 for 3)) || '-' || v_sku_counter;
        v_sku_counter := v_sku_counter + 1;
    END LOOP;

    -- 6. Insert new DRAFT product (is_active = false)
    INSERT INTO public.products (
        title,
        slug,
        sku,
        price,
        compare_at_price,
        category_id,
        collection_id,
        product_family_id,
        primary_color_id,
        color_name,
        show_color_option,
        brand,
        fabric,
        occasion,
        care_instructions,
        description,
        details,
        images,
        is_active,
        is_featured,
        is_trending,
        delivery_available,
        free_delivery,
        delivery_min_days,
        delivery_max_days,
        delivery_message,
        cod_available,
        express_delivery_available,
        is_returnable,
        return_window_days,
        return_policy_message,
        exchange_allowed
    ) VALUES (
        v_clean_title,
        v_target_slug,
        v_target_sku,
        v_src.price,
        v_src.compare_at_price,
        v_src.category_id,
        v_src.collection_id,
        v_family_id,
        p_primary_color_id,
        v_color_name_final,
        true,
        v_src.brand,
        v_src.fabric,
        v_src.occasion,
        v_src.care_instructions,
        v_src.description,
        COALESCE(v_src.details, '{}'),
        '{}',
        false, -- Default to DRAFT/INACTIVE for review
        false,
        false,
        v_src.delivery_available,
        v_src.free_delivery,
        v_src.delivery_min_days,
        v_src.delivery_max_days,
        v_src.delivery_message,
        v_src.cod_available,
        v_src.express_delivery_available,
        v_src.is_returnable,
        v_src.return_window_days,
        v_src.return_policy_message,
        v_src.exchange_allowed
    ) RETURNING id INTO v_new_product_id;

    -- 7. Copy distinct source sizes (one variant per distinct applicable size)
    FOR v_size_rec IN 
        SELECT DISTINCT ON (COALESCE(size_id::text, size))
            size_id,
            size,
            price_override
        FROM public.product_variants 
        WHERE product_id = p_source_product_id 
        ORDER BY COALESCE(size_id::text, size), created_at ASC
    LOOP
        v_var_sku := v_target_sku || '-' || COALESCE(v_size_rec.size, 'VAR');
        v_var_sku_counter := 1;
        WHILE EXISTS (SELECT 1 FROM public.product_variants WHERE sku = v_var_sku) AND v_var_sku_counter <= 100 LOOP
            v_var_sku := v_target_sku || '-' || COALESCE(v_size_rec.size, 'VAR') || '-' || v_var_sku_counter;
            v_var_sku_counter := v_var_sku_counter + 1;
        END LOOP;

        INSERT INTO public.product_variants (
            product_id,
            size_id,
            color_id,
            size,
            color_name,
            color_code,
            sku,
            price_override,
            is_active
        ) VALUES (
            v_new_product_id,
            v_size_rec.size_id,
            p_primary_color_id,
            v_size_rec.size,
            v_color_name_final,
            COALESCE(v_color.hex_code, '#000000'),
            v_var_sku,
            v_size_rec.price_override,
            true
        ) RETURNING id INTO v_new_variant_id;

        -- 8. Insert inventory row using exact live columns quantity and reserved_stock
        INSERT INTO public.inventory (
            variant_id,
            product_id,
            quantity,
            reserved_stock
        ) VALUES (
            v_new_variant_id,
            v_new_product_id,
            0,
            0
        );
    END LOOP;

    -- 9. Optionally copy product_images if explicitly requested
    IF p_copy_images THEN
        FOR v_img IN SELECT * FROM public.product_images WHERE product_id = p_source_product_id ORDER BY display_order ASC LOOP
            INSERT INTO public.product_images (
                product_id,
                image_url,
                storage_path,
                display_order,
                is_primary,
                alt_text
            ) VALUES (
                v_new_product_id,
                v_img.image_url,
                v_img.storage_path,
                v_img.display_order,
                v_img.is_primary,
                v_img.alt_text
            );
        END LOOP;
    END IF;

    RETURN QUERY SELECT v_family_id, v_new_product_id, v_target_slug, v_target_sku;
END;
$$;

-- Security Grants: Restricted strictly to service_role (called from protected server-side Admin action)
REVOKE EXECUTE ON FUNCTION public.create_product_colourway_atomic(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_colourway_atomic(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
