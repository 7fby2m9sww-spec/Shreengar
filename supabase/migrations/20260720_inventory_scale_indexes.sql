-- Migration: Add missing indexes and paginated search RPCs for inventory scalability (Sprint 2.5)
-- Description: Optimize performance for size, color, product, and inventory relations.

CREATE INDEX IF NOT EXISTS idx_product_variants_size_id ON public.product_variants (size_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color_id ON public.product_variants (color_id);

-- RPC for paginated inventory retrieval
CREATE OR REPLACE FUNCTION public.get_inventory_paginated(
    p_search TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_color_id UUID DEFAULT NULL,
    p_size_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'all', -- 'all', 'in_stock', 'low_stock', 'out_of_stock'
    p_limit INT DEFAULT 25,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    variant_id UUID,
    product_id UUID,
    quantity INT,
    reserved_quantity INT,
    available_quantity INT,
    low_stock_threshold INT,
    reorder_level INT,
    warehouse_location VARCHAR,
    stock_status VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    sku VARCHAR,
    product_name VARCHAR,
    size_name VARCHAR,
    color_name VARCHAR,
    color_code VARCHAR,
    category_id UUID,
    category_name VARCHAR,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_inventory AS (
        SELECT 
            i.id AS inv_id
        FROM public.inventory i
        JOIN public.product_variants pv ON i.variant_id = pv.id
        JOIN public.products p ON pv.product_id = p.id
        WHERE 
            -- Search filter
            (p_search IS NULL OR p_search = '' OR 
             pv.sku ILIKE '%' || p_search || '%' OR 
             p.name ILIKE '%' || p_search || '%' OR 
             i.warehouse_location ILIKE '%' || p_search || '%')
            -- Category filter
            AND (p_category_id IS NULL OR p.category_id = p_category_id)
            -- Color filter
            AND (p_color_id IS NULL OR pv.color_id = p_color_id)
            -- Size filter
            AND (p_size_id IS NULL OR pv.size_id = p_size_id)
            -- Status filter
            AND (
                p_status = 'all' OR
                (p_status = 'in_stock' AND i.quantity > COALESCE(i.reorder_level, 5)) OR
                (p_status = 'low_stock' AND i.quantity > 0 AND i.quantity <= COALESCE(i.reorder_level, 5)) OR
                (p_status = 'out_of_stock' AND i.quantity = 0)
            )
    ),
    count_total AS (
        SELECT COUNT(*)::BIGINT AS full_count FROM filtered_inventory
    )
    SELECT 
        i.id,
        i.variant_id,
        pv.product_id,
        i.quantity,
        i.reserved_quantity,
        i.available_quantity,
        i.low_stock_threshold,
        i.reorder_level,
        i.warehouse_location,
        i.stock_status,
        i.created_at,
        i.updated_at,
        pv.sku,
        p.name as product_name,
        s.name as size_name,
        c.name as color_name,
        c.hex_code as color_code,
        p.category_id,
        cat.name as category_name,
        ct.full_count as total_count
    FROM public.inventory i
    JOIN public.product_variants pv ON i.variant_id = pv.id
    JOIN public.products p ON pv.product_id = p.id
    LEFT JOIN public.sizes s ON pv.size_id = s.id
    LEFT JOIN public.colors c ON pv.color_id = c.id
    LEFT JOIN public.categories cat ON p.category_id = cat.id
    CROSS JOIN count_total ct
    WHERE i.id IN (SELECT inv_id FROM filtered_inventory)
    ORDER BY i.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- RPC for aggregate summaries
CREATE OR REPLACE FUNCTION public.get_inventory_summary()
RETURNS TABLE (
    total_variants INT,
    total_stock_units INT,
    total_reserved_units INT,
    total_available_units INT,
    low_stock_variants INT,
    out_of_stock_variants INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT as total_variants,
        COALESCE(SUM(quantity), 0)::INT as total_stock_units,
        COALESCE(SUM(reserved_quantity), 0)::INT as total_reserved_units,
        COALESCE(SUM(quantity - reserved_quantity), 0)::INT as total_available_units,
        COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= COALESCE(reorder_level, 5))::INT as low_stock_variants,
        COUNT(*) FILTER (WHERE quantity = 0)::INT as out_of_stock_variants
    FROM public.inventory;
END;
$$ LANGUAGE plpgsql;
