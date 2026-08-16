-- Migration: Add and ensure target_customer_ids support in coupons table
-- Date: 2026-08-15

ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS target_customer_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_customer_emails TEXT[] DEFAULT '{}';

-- Index for target customer queries
CREATE INDEX IF NOT EXISTS idx_coupons_target_customer_ids ON public.coupons USING GIN(target_customer_ids);
CREATE INDEX IF NOT EXISTS idx_coupons_target_customer_emails ON public.coupons USING GIN(target_customer_emails);
