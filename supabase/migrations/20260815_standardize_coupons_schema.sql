-- Migration: Standardize Coupons Table Schema & Sync Legacy Columns
-- Date: 2026-08-15

-- 1. Ensure all standardized columns exist on public.coupons
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_spend NUMERIC DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount NUMERIC;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_limit INT DEFAULT 500;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS used_count INT DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_type VARCHAR DEFAULT 'all';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_product_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_category_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_customer_ids UUID[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_customer_emails TEXT[] DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS first_time_only BOOLEAN DEFAULT false;

-- 2. Ensure legacy column aliases also exist for backward compatibility with database RPC functions
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS maximum_discount NUMERIC;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_type VARCHAR DEFAULT 'percentage';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

-- 3. Backfill existing row values across column pairs
UPDATE public.coupons SET
  start_date = COALESCE(start_date, starts_at, NOW()),
  end_date = COALESCE(end_date, expires_at, NOW() + INTERVAL '365 days'),
  starts_at = COALESCE(starts_at, start_date, NOW()),
  expires_at = COALESCE(expires_at, end_date, NOW() + INTERVAL '365 days'),
  min_spend = COALESCE(min_spend, minimum_order_amount, 0),
  minimum_order_amount = COALESCE(minimum_order_amount, min_spend, 0),
  max_discount = COALESCE(max_discount, maximum_discount, 1500),
  maximum_discount = COALESCE(maximum_discount, max_discount, 1500),
  discount_type = COALESCE(discount_type, type, 'percentage'),
  discount_value = COALESCE(discount_value, value, 0);

-- 4. Create trigger to automatically synchronize standard and legacy columns on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_coupons_schema_columns_func()
RETURNS TRIGGER AS $$
BEGIN
  NEW.start_date := COALESCE(NEW.start_date, NEW.starts_at, NOW());
  NEW.end_date := COALESCE(NEW.end_date, NEW.expires_at, NOW() + INTERVAL '365 days');
  NEW.starts_at := NEW.start_date;
  NEW.expires_at := NEW.end_date;

  NEW.min_spend := COALESCE(NEW.min_spend, NEW.minimum_order_amount, 0);
  NEW.minimum_order_amount := NEW.min_spend;

  NEW.max_discount := COALESCE(NEW.max_discount, NEW.maximum_discount, 1500);
  NEW.maximum_discount := NEW.max_discount;

  NEW.type := COALESCE(NEW.type, NEW.discount_type, 'percentage');
  NEW.discount_type := NEW.type;

  NEW.value := COALESCE(NEW.value, NEW.discount_value, 0);
  NEW.discount_value := NEW.value;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_coupons_schema_columns ON public.coupons;
CREATE TRIGGER sync_coupons_schema_columns
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_coupons_schema_columns_func();
