-- Migration: Create Product Catalog Search and Filtering Indexes (Sprint 2.4)
-- Description: Indexes to optimize search by name, category, collection, selling price, and variants matching.

CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_collection_id ON public.products (collection_id);
CREATE INDEX IF NOT EXISTS idx_products_selling_price ON public.products (selling_price);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants (sku);
