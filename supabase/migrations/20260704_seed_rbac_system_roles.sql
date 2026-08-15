-- ========================================================
-- MIGRATION: RECONCILE ROLES TABLE SCHEMA & SEED SYSTEM ROLES
-- File: supabase/migrations/20260704_seed_rbac_system_roles.sql
-- Description: Reconciles live public.roles schema by adding code column,
--              unique constraint, seeding immutable system roles with display_name,
--              and configuring public read RLS policy on public.roles.
-- ========================================================

-- 1. Ensure `code` column exists on public.roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'roles' 
          AND column_name = 'code'
    ) THEN
        ALTER TABLE public.roles ADD COLUMN code VARCHAR(100);
    END IF;
END $$;

-- 2. Add UNIQUE constraint on code if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'roles_code_key' OR conname = 'roles_code_unique'
    ) THEN
        ALTER TABLE public.roles ADD CONSTRAINT roles_code_unique UNIQUE (code);
    END IF;
END $$;

-- 3. Idempotently seed the six immutable system roles including display_name
INSERT INTO public.roles (name, display_name, code, description, is_system)
VALUES
    ('Super Admin', 'Super Admin', 'super_admin', 'Full un-restricted administrative access across all store modules.', true),
    ('Admin', 'Admin', 'admin', 'Full store catalog, order fulfillment, and banner management.', true),
    ('Manager', 'Manager', 'manager', 'Order management, customer relations, and content publishing.', true),
    ('Inventory Manager', 'Inventory Manager', 'inventory_manager', 'Stock adjustment, warehouse bin management, and supplier ordering.', true),
    ('Customer Support', 'Customer Support', 'customer_support', 'Order tracking, customer inquiries, and review moderation.', true),
    ('Marketing', 'Marketing', 'marketing', 'Promotional coupons, banner slides, and blog publishing.', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system;

-- 4. Enforce NOT NULL on `code` column after seed insertion
ALTER TABLE public.roles ALTER COLUMN code SET NOT NULL;

-- 5. Enable RLS and Configure Read Policy on public.roles ONLY
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roles Read Policy" ON public.roles;
DROP POLICY IF EXISTS "Roles Admin Manage Policy" ON public.roles;

-- Allow reading role definitions
CREATE POLICY "Roles Read Policy" ON public.roles
    FOR SELECT
    USING (true);
