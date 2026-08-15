-- Migration: Add Per-Product Storefront Stock Message Configuration (Sprint 3.3.2)
-- Description: Adds show_storefront_stock_message and storefront_stock_message_quantity to public.products, and drops obsolete warning threshold columns if exist.

BEGIN;

ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS show_storefront_stock_message BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS storefront_stock_message_quantity INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_product_storefront_stock_message_quantity CHECK (storefront_stock_message_quantity >= 1 AND storefront_stock_message_quantity <= 20);

ALTER TABLE public.products
    DROP COLUMN IF EXISTS show_low_stock_warning,
    DROP COLUMN IF EXISTS low_stock_warning_threshold;

COMMIT;
