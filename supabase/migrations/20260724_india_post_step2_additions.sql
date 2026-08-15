-- Additive Migration: India Post Shipping Step 2A Status Upgrades
-- File: supabase/migrations/20260724_india_post_step2_additions.sql
-- Description: Adds is_archived column and checks to prevent invalid lifecycle state combinations.

ALTER TABLE public.india_post_tariff_versions 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Constraint: A version cannot be active and archived simultaneously
ALTER TABLE public.india_post_tariff_versions
DROP CONSTRAINT IF EXISTS chk_not_active_and_archived,
ADD CONSTRAINT chk_not_active_and_archived
CHECK (NOT (is_active = true AND is_archived = true));

-- Constraint: A version cannot be active without verification fields (verified_at and verified_by)
ALTER TABLE public.india_post_tariff_versions
DROP CONSTRAINT IF EXISTS chk_active_requires_verification,
ADD CONSTRAINT chk_active_requires_verification
CHECK (NOT (is_active = true AND (verified_at IS NULL OR verified_by IS NULL)));
