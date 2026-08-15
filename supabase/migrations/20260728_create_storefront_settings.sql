-- Migration: Create Storefront Settings Table (Sprint 3.3.2)
-- Description: Adds a single-row storefront_settings table for low-stock urgency configurations.

BEGIN;

CREATE TABLE IF NOT EXISTS public.storefront_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default' CONSTRAINT single_row CHECK (id = 'default'),
    show_low_stock_warning BOOLEAN NOT NULL DEFAULT true,
    low_stock_warning_threshold INTEGER NOT NULL DEFAULT 3 CONSTRAINT chk_low_stock_threshold CHECK (low_stock_warning_threshold >= 1 AND low_stock_warning_threshold <= 20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: public access
DROP POLICY IF EXISTS "Anyone can view storefront settings" ON public.storefront_settings;
CREATE POLICY "Anyone can view storefront settings" ON public.storefront_settings
    FOR SELECT USING (true);

-- Admin management policy via service role
DROP POLICY IF EXISTS "Admins can manage storefront settings" ON public.storefront_settings;
CREATE POLICY "Admins can manage storefront settings" ON public.storefront_settings
    FOR ALL TO service_role USING (true);

-- Seed initial row
INSERT INTO public.storefront_settings (id, show_low_stock_warning, low_stock_warning_threshold)
VALUES ('default', true, 3)
ON CONFLICT (id) DO NOTHING;

COMMIT;
