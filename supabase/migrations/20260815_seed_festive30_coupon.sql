-- Migration: Seed and ensure valid active FESTIVE30 promo code
-- Date: 2026-08-15

INSERT INTO public.coupons (
  code,
  type,
  value,
  min_spend,
  max_discount,
  start_date,
  end_date,
  usage_limit,
  used_count,
  is_active,
  target_type,
  target_product_ids,
  target_category_ids,
  target_customer_ids,
  target_customer_emails,
  first_time_only,
  created_at
) VALUES (
  'FESTIVE30',
  'percentage',
  30,
  2999,
  1500,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '365 days',
  500,
  0,
  true,
  'all',
  '{}',
  '{}',
  '{}',
  '{}',
  false,
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  is_active = true,
  start_date = NOW() - INTERVAL '1 day',
  end_date = NOW() + INTERVAL '365 days',
  min_spend = 2999,
  value = 30,
  type = 'percentage',
  target_type = 'all';
