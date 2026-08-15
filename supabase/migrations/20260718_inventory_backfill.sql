-- Migration: Inventory Backfill for Simple Products (Sprint 3)
-- Description: Create default variants and inventory records for products that currently have no variants.
-- This script is idempotent and safe to run multiple times.

DO $$
DECLARE
    size_id_val UUID;
    color_id_val UUID;
    prod_rec RECORD;
    variant_id_val UUID;
    target_sku VARCHAR(100);
    
    size_created_count INT := 0;
    color_created_count INT := 0;
    variants_created_count INT := 0;
    inventory_created_count INT := 0;
    skipped_sku_count INT := 0;
BEGIN
    -- 1. Ensure a default size "One Size" exists
    IF NOT EXISTS (SELECT 1 FROM public.sizes WHERE name = 'One Size') THEN
        INSERT INTO public.sizes (name, display_name, display_order, is_active)
        VALUES ('One Size', 'One Size', 0, true)
        RETURNING id INTO size_id_val;
        size_created_count := 1;
    ELSE
        SELECT id INTO size_id_val FROM public.sizes WHERE name = 'One Size';
    END IF;

    -- 2. Ensure a default color "Default" exists
    IF NOT EXISTS (SELECT 1 FROM public.colors WHERE slug = 'default') THEN
        INSERT INTO public.colors (name, slug, hex_code, display_order, is_active)
        VALUES ('Default', 'default', '#E5DDC8', 0, true) -- Elegant cream/gold hue
        RETURNING id INTO color_id_val;
        color_created_count := 1;
    ELSE
        SELECT id INTO color_id_val FROM public.colors WHERE slug = 'default';
    END IF;

    -- 3. Loop through products that do not have any variants
    FOR prod_rec IN 
        SELECT id, sku, name 
        FROM public.products p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id
        )
    LOOP
        variant_id_val := NULL;

        -- 4. Check for invalid or missing SKU
        IF prod_rec.sku IS NULL OR TRIM(prod_rec.sku) = '' THEN
            skipped_sku_count := skipped_sku_count + 1;
            RAISE WARNING 'Product % (%) has a missing or empty SKU. Skipping.', prod_rec.name, prod_rec.id;
            CONTINUE;
        END IF;

        target_sku := TRIM(prod_rec.sku) || '-DEF';

        -- 5. Detect SKU collision across other products
        IF EXISTS (
            SELECT 1 FROM public.product_variants 
            WHERE sku = target_sku AND product_id <> prod_rec.id
        ) THEN
            RAISE EXCEPTION 'SKU collision detected: Variant SKU % is already assigned to a different product.', target_sku;
        END IF;

        -- 6. Insert default variant safely
        INSERT INTO public.product_variants (product_id, size_id, color_id, sku, is_default, is_active)
        VALUES (prod_rec.id, size_id_val, color_id_val, target_sku, true, true)
        ON CONFLICT (sku) DO NOTHING
        RETURNING id INTO variant_id_val;

        -- If conflict happened for this product, retrieve it with strict validation
        IF variant_id_val IS NULL THEN
            SELECT id INTO variant_id_val 
            FROM public.product_variants 
            WHERE sku = target_sku
              AND product_id = prod_rec.id
              AND size_id = size_id_val
              AND color_id = color_id_val
              AND is_default = true;
        ELSE
            variants_created_count := variants_created_count + 1;
        END IF;

        -- 7. Insert matching inventory row safely
        IF variant_id_val IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM public.inventory WHERE variant_id = variant_id_val) THEN
                INSERT INTO public.inventory (variant_id, quantity, reserved_quantity, low_stock_threshold, reorder_level, stock_status)
                VALUES (variant_id_val, 0, 0, 5, 10, 'out_of_stock');
                
                inventory_created_count := inventory_created_count + 1;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'Backfill complete:';
    RAISE NOTICE '  - Default Sizes created: %', size_created_count;
    RAISE NOTICE '  - Default Colors created: %', color_created_count;
    RAISE NOTICE '  - Variants created: %', variants_created_count;
    RAISE NOTICE '  - Inventory rows created: %', inventory_created_count;
    RAISE NOTICE '  - Products skipped (invalid SKU): %', skipped_sku_count;
END $$;
