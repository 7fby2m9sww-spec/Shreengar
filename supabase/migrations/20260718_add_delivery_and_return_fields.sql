-- Migration: Add Delivery & Return Fields to Products Table (Sprint 3)
-- Description: Implement configuration columns for shipping options (COD, express, timing) and return/exchange policies on products.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS free_delivery BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_min_days INTEGER,
ADD COLUMN IF NOT EXISTS delivery_max_days INTEGER,
ADD COLUMN IF NOT EXISTS delivery_message TEXT,
ADD COLUMN IF NOT EXISTS cod_available BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS express_delivery_available BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS return_window_days INTEGER,
ADD COLUMN IF NOT EXISTS return_policy_message TEXT,
ADD COLUMN IF NOT EXISTS exchange_allowed BOOLEAN NOT NULL DEFAULT false;

-- Backfill step for existing-row compatibility before adding constraints
-- Existing products default to returnable (is_returnable = true) with a standard 7-day window.
-- For any non-returnable products (is_returnable = false), return_window_days remains NULL.
UPDATE public.products
SET return_window_days = 7
WHERE is_returnable = true AND return_window_days IS NULL;

UPDATE public.products
SET return_window_days = NULL
WHERE is_returnable = false;

-- Add constraints for safety
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS check_delivery_days,
DROP CONSTRAINT IF EXISTS check_positive_return_window;

-- Paired-field delivery constraint: either both are null, or both are set and valid.
ALTER TABLE public.products
ADD CONSTRAINT check_delivery_days CHECK (
  (
    delivery_min_days IS NULL
    AND delivery_max_days IS NULL
  )
  OR
  (
    delivery_min_days > 0
    AND delivery_max_days > 0
    AND delivery_max_days >= delivery_min_days
  )
);

-- Strict return window constraint synchronized with is_returnable status
ALTER TABLE public.products
ADD CONSTRAINT check_positive_return_window CHECK (
  (
    is_returnable = false
    AND return_window_days IS NULL
  )
  OR
  (
    is_returnable = true
    AND return_window_days IS NOT NULL
    AND return_window_days > 0
  )
);

COMMENT ON COLUMN public.products.delivery_available IS 'Whether delivery is available for this product';
COMMENT ON COLUMN public.products.free_delivery IS 'Whether shipping is free';
COMMENT ON COLUMN public.products.delivery_min_days IS 'Minimum estimated delivery time in days';
COMMENT ON COLUMN public.products.delivery_max_days IS 'Maximum estimated delivery time in days';
COMMENT ON COLUMN public.products.delivery_message IS 'Optional specific notes or warnings regarding delivery';
COMMENT ON COLUMN public.products.cod_available IS 'Whether Cash on Delivery is allowed';
COMMENT ON COLUMN public.products.express_delivery_available IS 'Whether express delivery is supported';
COMMENT ON COLUMN public.products.return_window_days IS 'Number of days allowed to request a return';
COMMENT ON COLUMN public.products.return_policy_message IS 'Optional specific details about return exceptions';
COMMENT ON COLUMN public.products.exchange_allowed IS 'Whether exchanges are allowed instead of returns';
