-- ========================================================
-- MIGRATION: ALIGN ADMIN_USERS TABLE COLUMNS
-- File: supabase/migrations/20260704_align_admin_users_columns.sql
-- Description: Adds email, full_name, and avatar_url columns to public.admin_users
--              with a unique constraint on email.
-- ========================================================

-- 1. Add missing columns expected by application code if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'admin_users' 
          AND column_name = 'email'
    ) THEN
        ALTER TABLE public.admin_users ADD COLUMN email VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'admin_users' 
          AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.admin_users ADD COLUMN full_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'admin_users' 
          AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.admin_users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 2. Add UNIQUE constraint on email if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_email_key' OR conname = 'admin_users_email_unique'
    ) THEN
        ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);
    END IF;
END $$;
