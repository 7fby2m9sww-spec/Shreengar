-- ========================================================
-- MIGRATION: ALIGN ADDRESSES TABLE COLUMNS WITH APPLICATION SCHEMA
-- File: supabase/migrations/20260704_align_addresses_columns.sql
-- Description: Renames columns in public.addresses to match application expectations:
--              - address_line_1      -> address_line1
--              - address_line_2      -> address_line2
--              - is_default_shipping -> is_default
--              - retains is_default_billing column
-- ========================================================

DO $$ 
BEGIN 
    -- 1. Rename address_line_1 to address_line1 if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'addresses' 
          AND column_name = 'address_line_1'
    ) THEN
        ALTER TABLE public.addresses RENAME COLUMN address_line_1 TO address_line1;
    END IF;

    -- 2. Rename address_line_2 to address_line2 if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'addresses' 
          AND column_name = 'address_line_2'
    ) THEN
        ALTER TABLE public.addresses RENAME COLUMN address_line_2 TO address_line2;
    END IF;

    -- 3. Rename is_default_shipping to is_default if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'addresses' 
          AND column_name = 'is_default_shipping'
    ) THEN
        ALTER TABLE public.addresses RENAME COLUMN is_default_shipping TO is_default;
    END IF;

    -- 4. Ensure is_default_billing column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'addresses' 
          AND column_name = 'is_default_billing'
    ) THEN
        ALTER TABLE public.addresses ADD COLUMN is_default_billing BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
