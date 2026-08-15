-- Migration: Add Product Variants Unique Constraint (Sprint 3.1)
-- Description: Create a unique index on product_variants (product_id, color_id, size_id) to prevent duplicate Cartesian options.

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_prod_color_size_idx 
ON public.product_variants (product_id, color_id, size_id);
