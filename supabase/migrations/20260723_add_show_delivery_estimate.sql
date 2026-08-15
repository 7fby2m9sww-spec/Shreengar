-- Migration: Add show_delivery_estimate to products table
-- Description: Implement configuration toggle to show/hide delivery estimate block on storefront product page.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS show_delivery_estimate BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.show_delivery_estimate IS 'Whether to show the estimated delivery dates and pincode checker on the storefront product page';
