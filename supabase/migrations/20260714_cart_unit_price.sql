-- Migration: Sprint 3.1 — Add unit_price to cart table
-- Snapshots the price at time of add to prevent stale checkout prices.

ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

-- Index for fast user cart lookups
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_variant_id ON public.cart (variant_id);
