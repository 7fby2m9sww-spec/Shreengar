-- Migration: Add showroom_collection_only and pickup_available to products table
-- Description: Implement configuration toggle for showroom collection and store pickup settings.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS showroom_collection_only BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.showroom_collection_only IS 'Whether the product is only available for showroom collection';
COMMENT ON COLUMN public.products.pickup_available IS 'Whether store pickup is available for this product';
