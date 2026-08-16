-- Migration: Add Granular Targeted Coupon Rules and Product Review Constraints
-- Date: 2026-08-15

-- 1. Extend Coupons Table with Targeting Columns
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'all' CHECK (target_type IN ('all', 'products', 'categories', 'selected_customers', 'first_time_buyers')),
ADD COLUMN IF NOT EXISTS target_product_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_category_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_customer_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_customer_emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS first_time_only BOOLEAN DEFAULT FALSE;

-- Index for target_type lookups
CREATE INDEX IF NOT EXISTS idx_coupons_target_type ON public.coupons(target_type);

-- 2. Ensure Reviews Table Structure and RLS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name VARCHAR(150) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Unique Constraint if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_product_review'
    ) THEN
        ALTER TABLE public.reviews ADD CONSTRAINT unique_user_product_review UNIQUE(user_id, product_id);
    END IF;
END $$;

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop old policies if existing to avoid conflicts
DROP POLICY IF EXISTS "Public view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins manage all reviews" ON public.reviews;

-- Reviews RLS Policies
CREATE POLICY "Public view approved reviews" 
ON public.reviews FOR SELECT 
USING (status = 'approved' OR auth.uid() IN (SELECT id FROM public.admin_users));

CREATE POLICY "Authenticated users submit reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage all reviews" 
ON public.reviews FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Index for reviews product & status queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON public.reviews(product_id, status);
