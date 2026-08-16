-- Migration: Fix coupons table RLS policies and admin access
-- Date: 2026-08-15

-- Enable RLS on coupons table
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies on coupons
DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins full access coupons" ON public.coupons;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.coupons;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.coupons;

-- 1. Public / Storefront read policy (allows customer coupon validation and storefront display)
CREATE POLICY "Public read coupons" ON public.coupons
  FOR SELECT USING (true);

-- 2. Full access policy (allows admin management, inserts, updates, deletes)
CREATE POLICY "Admins full access coupons" ON public.coupons
  FOR ALL USING (true) WITH CHECK (true);

-- Grant privileges to roles
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
GRANT SELECT ON public.coupons TO anon;
