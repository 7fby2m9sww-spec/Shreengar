-- Migration: Manual Shipping Foundation Setup (Corrected V3)
-- File: supabase/migrations/20260724_manual_india_post_shipping_foundation.sql
-- Description: Idempotent script for manual execution in the Supabase SQL Editor. Creates shipping tables, adds columns to existing tables, enables RLS, and seeds defaults.

-- =========================================================================
-- 1. India Post Tariff Versions Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.india_post_tariff_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    service_code VARCHAR(50),
    source_reference TEXT,
    source_document_date DATE,
    effective_from DATE,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_by UUID,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active version exists at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_tariff_version 
ON public.india_post_tariff_versions (is_active) 
WHERE (is_active = true);

-- =========================================================================
-- 2. India Post Tariff Rates Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.india_post_tariff_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tariff_version_id UUID NOT NULL REFERENCES public.india_post_tariff_versions(id) ON DELETE CASCADE,
    origin_zone_code VARCHAR(50),
    destination_zone_code VARCHAR(50),
    service_code VARCHAR(50),
    base_weight_grams INTEGER NOT NULL CONSTRAINT chk_tariff_rates_base_weight CHECK (base_weight_grams >= 0),
    base_rate_paise INTEGER NOT NULL CONSTRAINT chk_tariff_rates_base_rate CHECK (base_rate_paise >= 0),
    additional_slab_grams INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_tariff_rates_add_slab CHECK (additional_slab_grams >= 0),
    additional_slab_rate_paise INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_tariff_rates_add_rate CHECK (additional_slab_rate_paise >= 0),
    tax_rate_basis_points INTEGER DEFAULT NULL CONSTRAINT chk_tariff_rates_tax_bp CHECK (tax_rate_basis_points IS NULL OR (tax_rate_basis_points >= 0 AND tax_rate_basis_points <= 10000)),
    remote_surcharge_paise INTEGER DEFAULT NULL CONSTRAINT chk_tariff_rates_remote_surcharge CHECK (remote_surcharge_paise IS NULL OR remote_surcharge_paise >= 0),
    min_weight_grams INTEGER NOT NULL CONSTRAINT chk_tariff_rates_min_weight CHECK (min_weight_grams >= 0),
    max_weight_grams INTEGER NOT NULL CONSTRAINT chk_tariff_rates_max_weight CHECK (max_weight_grams >= min_weight_grams),
    estimated_min_days INTEGER CONSTRAINT chk_tariff_rates_est_min_days CHECK (estimated_min_days IS NULL OR estimated_min_days >= 0),
    estimated_max_days INTEGER CONSTRAINT chk_tariff_rates_est_max_days CHECK (estimated_max_days IS NULL OR estimated_min_days IS NULL OR estimated_max_days >= estimated_min_days),
    is_serviceable BOOLEAN DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rate lookup performance
CREATE INDEX IF NOT EXISTS idx_tariff_rates_lookup_v2
ON public.india_post_tariff_rates(tariff_version_id, destination_zone_code, min_weight_grams, max_weight_grams);

-- =========================================================================
-- 3. India Post Pincodes Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.india_post_pincodes (
    pincode VARCHAR(6) PRIMARY KEY CONSTRAINT check_pincode_six_digits CHECK (pincode ~ '^[0-9]{6}$'),
    office_name VARCHAR(255),
    district VARCHAR(100),
    state VARCHAR(100),
    region VARCHAR(100),
    circle VARCHAR(100),
    postal_zone_code VARCHAR(50),
    is_remote BOOLEAN DEFAULT NULL,
    is_serviceable BOOLEAN DEFAULT NULL,
    source_reference TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- For coordinate distance fallback compatibility:
    latitude NUMERIC(9,6) NULL,
    longitude NUMERIC(9,6) NULL
);

CREATE INDEX IF NOT EXISTS idx_pincodes_search_v2 ON public.india_post_pincodes(pincode);

-- =========================================================================
-- 4. Shipping Settings Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.shipping_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default' CONSTRAINT single_row CHECK (id = 'default'),
    provider VARCHAR(50) NOT NULL DEFAULT 'india_post',
    calculation_mode VARCHAR(50) NOT NULL DEFAULT 'admin_tariff_table',
    origin_pincode VARCHAR(10) NOT NULL CONSTRAINT chk_settings_origin_pincode CHECK (origin_pincode ~ '^[0-9]{6}$'),
    shipping_enabled BOOLEAN NOT NULL DEFAULT false,
    prepaid_only BOOLEAN NOT NULL DEFAULT true,
    active_tariff_version_id UUID REFERENCES public.india_post_tariff_versions(id) ON DELETE SET NULL,
    free_shipping_enabled BOOLEAN NOT NULL DEFAULT false,
    free_shipping_threshold_paise INTEGER DEFAULT NULL CONSTRAINT chk_settings_free_shipping_threshold CHECK (free_shipping_threshold_paise IS NULL OR free_shipping_threshold_paise >= 0),
    volumetric_enabled BOOLEAN NOT NULL DEFAULT false,
    volumetric_divisor INTEGER DEFAULT NULL CONSTRAINT chk_settings_volumetric_divisor CHECK (volumetric_divisor IS NULL OR volumetric_divisor > 0),
    tare_weight_grams INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_settings_tare_weight CHECK (tare_weight_grams >= 0),
    quote_expiry_minutes INTEGER NOT NULL DEFAULT 20 CONSTRAINT chk_settings_quote_expiry CHECK (quote_expiry_minutes > 0),
    shipping_policy_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- 5. Shipping Quotes Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.shipping_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID,
    customer_id UUID,
    session_id VARCHAR(255),
    provider VARCHAR(50) NOT NULL DEFAULT 'india_post',
    service_code VARCHAR(50),
    tariff_version_id UUID REFERENCES public.india_post_tariff_versions(id) ON DELETE SET NULL,
    tariff_rate_id UUID REFERENCES public.india_post_tariff_rates(id) ON DELETE SET NULL,
    origin_pincode VARCHAR(10) CONSTRAINT chk_quotes_origin_pincode CHECK (origin_pincode IS NULL OR origin_pincode ~ '^[0-9]{6}$'),
    destination_pincode VARCHAR(10) CONSTRAINT chk_quotes_destination_pincode CHECK (destination_pincode IS NULL OR destination_pincode ~ '^[0-9]{6}$'),
    origin_zone_code VARCHAR(50),
    destination_zone_code VARCHAR(50),
    item_weight_grams INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_quotes_item_weight CHECK (item_weight_grams >= 0),
    tare_weight_grams INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_quotes_tare_weight CHECK (tare_weight_grams >= 0),
    actual_weight_grams INTEGER NOT NULL CONSTRAINT chk_quotes_actual_weight CHECK (actual_weight_grams >= 0),
    volumetric_weight_grams INTEGER NOT NULL CONSTRAINT chk_quotes_volumetric_weight CHECK (volumetric_weight_grams >= 0),
    chargeable_weight_grams INTEGER NOT NULL CONSTRAINT chk_quotes_chargeable_weight CHECK (chargeable_weight_grams >= 0),
    postage_before_tax_paise INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_quotes_postage_before_tax CHECK (postage_before_tax_paise >= 0),
    tax_paise INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_quotes_tax CHECK (tax_paise >= 0),
    shipping_discount_paise INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_quotes_discount CHECK (shipping_discount_paise >= 0),
    customer_shipping_charge_paise INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_quotes_customer_charge CHECK (customer_shipping_charge_paise >= 0),
    merchant_shipping_cost_paise INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_quotes_merchant_cost CHECK (merchant_shipping_cost_paise >= 0),
    estimated_min_days INTEGER CONSTRAINT chk_quotes_est_min_days CHECK (estimated_min_days IS NULL OR estimated_min_days >= 0),
    estimated_max_days INTEGER CONSTRAINT chk_quotes_est_max_days CHECK (estimated_max_days IS NULL OR estimated_min_days IS NULL OR estimated_max_days >= estimated_min_days),
    rate_source VARCHAR(100),
    quote_snapshot JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Legacy field mapping compatibility:
    distance_km NUMERIC(9, 2),
    zone VARCHAR(50),
    base_tariff_paise INTEGER DEFAULT 0 CONSTRAINT chk_quotes_base_tariff CHECK (base_tariff_paise >= 0),
    gst_rate_percent NUMERIC(5, 2) DEFAULT NULL,
    gst_amount_paise INTEGER DEFAULT 0 CONSTRAINT chk_quotes_gst_amount CHECK (gst_amount_paise >= 0),
    total_tariff_paise INTEGER DEFAULT 0 CONSTRAINT chk_quotes_total_tariff CHECK (total_tariff_paise >= 0),
    items_snapshot JSONB,

    CONSTRAINT chk_quotes_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- =========================================================================
-- 6. Products Table Updates (Additive, Keep only canonical parcel_*)
-- =========================================================================
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS shipping_weight_grams INTEGER CHECK (shipping_weight_grams IS NULL OR shipping_weight_grams > 0),
ADD COLUMN IF NOT EXISTS parcel_length_cm NUMERIC(6,2) CHECK (parcel_length_cm IS NULL OR parcel_length_cm > 0),
ADD COLUMN IF NOT EXISTS parcel_width_cm NUMERIC(6,2) CHECK (parcel_width_cm IS NULL OR parcel_width_cm > 0),
ADD COLUMN IF NOT EXISTS parcel_height_cm NUMERIC(6,2) CHECK (parcel_height_cm IS NULL OR parcel_height_cm > 0),
ADD COLUMN IF NOT EXISTS use_global_shipping BOOLEAN NOT NULL DEFAULT true;

-- =========================================================================
-- 7. Product Variants Table Updates (Additive)
-- =========================================================================
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS shipping_weight_grams INTEGER CHECK (shipping_weight_grams IS NULL OR shipping_weight_grams > 0);

-- =========================================================================
-- 8. Orders Table Updates (Additive)
-- =========================================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_provider VARCHAR(50) DEFAULT 'india_post',
ADD COLUMN IF NOT EXISTS shipping_service_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS shipping_origin_pincode VARCHAR(10),
ADD COLUMN IF NOT EXISTS shipping_destination_pincode VARCHAR(10),
ADD COLUMN IF NOT EXISTS shipping_tariff_version_id UUID,
ADD COLUMN IF NOT EXISTS shipping_chargeable_weight_grams INTEGER,
ADD COLUMN IF NOT EXISTS shipping_cost_paise INTEGER,
ADD COLUMN IF NOT EXISTS customer_shipping_charge_paise INTEGER,
ADD COLUMN IF NOT EXISTS shipping_tax_paise INTEGER,
ADD COLUMN IF NOT EXISTS estimated_delivery_min INTEGER,
ADD COLUMN IF NOT EXISTS estimated_delivery_max INTEGER,
ADD COLUMN IF NOT EXISTS shipping_quote_snapshot JSONB,
-- Legacy field mapping compatibility:
ADD COLUMN IF NOT EXISTS shipping_quote_id UUID REFERENCES public.shipping_quotes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS shipping_zone VARCHAR(50),
ADD COLUMN IF NOT EXISTS shipping_tariff_paise INTEGER,
ADD COLUMN IF NOT EXISTS shipping_snapshot JSONB,
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10,2);

-- =========================================================================
-- 9. Row Level Security (RLS) Configuration (Clean & Private)
-- =========================================================================
ALTER TABLE public.india_post_tariff_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.india_post_tariff_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.india_post_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;

-- Remove RLS policies entirely (Strictly server-side access only via service_role client)
DROP POLICY IF EXISTS "Admins can manage tariff versions" ON public.india_post_tariff_versions;
DROP POLICY IF EXISTS "Admins can manage tariff rates" ON public.india_post_tariff_rates;
DROP POLICY IF EXISTS "Admins can manage pincodes" ON public.india_post_pincodes;
DROP POLICY IF EXISTS "Admins can manage shipping settings" ON public.shipping_settings;
DROP POLICY IF EXISTS "Admins can manage quotes" ON public.shipping_quotes;

-- =========================================================================
-- 10. Seed Origin Pincode 110092 (serviceability/zone metadata left NULL)
-- =========================================================================
INSERT INTO public.india_post_pincodes (pincode, source_reference)
VALUES ('110092', 'Origin Dispatch Pincode')
ON CONFLICT (pincode) DO NOTHING;

-- =========================================================================
-- 11. Seed Safe Default Shipping Settings (ON CONFLICT DO NOTHING to protect future config)
-- =========================================================================
INSERT INTO public.shipping_settings (
    id,
    provider,
    calculation_mode,
    origin_pincode,
    shipping_enabled,
    prepaid_only,
    active_tariff_version_id,
    free_shipping_enabled,
    free_shipping_threshold_paise,
    volumetric_enabled,
    volumetric_divisor,
    tare_weight_grams,
    quote_expiry_minutes,
    shipping_policy_message
) VALUES (
    'default',
    'india_post',
    'admin_tariff_table',
    '110092',
    false,
    true,
    NULL,
    false,
    NULL,
    false,
    NULL,
    0,
    20,
    NULL
) ON CONFLICT (id) DO NOTHING;
