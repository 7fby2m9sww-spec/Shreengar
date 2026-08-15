-- =========================================================================================
-- MIGRATION: SEED RBAC PERMISSIONS & ROLE-PERMISSION MAPPINGS
-- File: supabase/migrations/20260715_seed_rbac_permissions.sql
-- Description: Idempotent seed for permissions catalog and role-permission matrix.
-- =========================================================================================

BEGIN;

-- 1. SEED PERMISSIONS
-- Using INSERT ... ON CONFLICT to ensure idempotency. 
-- We assume `name` is unique. 

INSERT INTO public.permissions (name, module, display_name, description, is_system)
VALUES 
    ('manage_dashboard', 'Dashboard', 'Manage Dashboard', 'Access and manage dashboard analytics', true),
    ('manage_products', 'Catalog', 'Manage Products', 'Create, edit, and delete products', true),
    ('manage_categories', 'Catalog', 'Manage Categories', 'Create, edit, and delete categories', true),
    ('manage_collections', 'Catalog', 'Manage Collections', 'Create, edit, and delete collections', true),
    ('manage_variants', 'Catalog', 'Manage Variants', 'Manage product variants', true),
    ('manage_inventory', 'Inventory', 'Manage Inventory', 'Adjust stock and warehouses', true),
    ('manage_orders', 'Orders', 'Manage Orders', 'Process, fulfill, and cancel orders', true),
    ('manage_customers', 'Customers', 'Manage Customers', 'View and edit customer profiles', true),
    ('manage_coupons', 'Marketing', 'Manage Coupons', 'Create and manage discount coupons', true),
    ('manage_banners', 'Marketing', 'Manage Banners', 'Manage homepage banners and sliders', true),
    ('manage_reviews', 'Reviews', 'Manage Reviews', 'Moderate customer product reviews', true),
    ('manage_admin_users', 'System', 'Manage Admin Users', 'Add or remove admin staff', true),
    ('manage_roles', 'System', 'Manage Roles', 'Create and manage custom roles', true),
    ('manage_permissions', 'System', 'Manage Permissions', 'View the permission catalog', true),
    ('manage_security', 'System', 'Manage Security', 'Access security settings', true),
    ('manage_activity_logs', 'System', 'View Activity Logs', 'View audit and activity logs', true)
ON CONFLICT (name) DO UPDATE 
SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    module = EXCLUDED.module;

-- 2. SEED ROLE-PERMISSIONS
-- We use DO blocks to dynamically resolve role UUIDs and permission UUIDs 
-- to prevent hardcoded UUID failures.

DO $$
DECLARE
    v_role_super_admin UUID;
    v_role_admin UUID;
    v_role_manager UUID;
    v_role_inventory UUID;
    v_role_support UUID;
    v_role_marketing UUID;
BEGIN
    -- Fetch Roles
    SELECT id INTO v_role_super_admin FROM public.roles WHERE code = 'super_admin';
    SELECT id INTO v_role_admin FROM public.roles WHERE code = 'admin';
    SELECT id INTO v_role_manager FROM public.roles WHERE code = 'manager';
    SELECT id INTO v_role_inventory FROM public.roles WHERE code = 'inventory_manager';
    SELECT id INTO v_role_support FROM public.roles WHERE code = 'customer_support';
    SELECT id INTO v_role_marketing FROM public.roles WHERE code = 'marketing';

    -- 2.1 SUPER ADMIN (All permissions)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_super_admin, p.id FROM public.permissions p
    ON CONFLICT ON CONSTRAINT role_permissions_role_id_permission_id_key DO NOTHING;

    -- 2.2 ADMIN (Operational permissions, no system control)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_admin, p.id FROM public.permissions p
    WHERE p.name IN (
        'manage_dashboard', 'manage_products', 'manage_categories', 'manage_collections', 
        'manage_variants', 'manage_inventory', 'manage_orders', 'manage_customers', 
        'manage_coupons', 'manage_banners', 'manage_reviews'
    )
    ON CONFLICT ON CONSTRAINT role_permissions_role_id_permission_id_key DO NOTHING;

    -- 2.3 MANAGER (Catalog, orders, customers, operations)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_manager, p.id FROM public.permissions p
    WHERE p.name IN (
        'manage_dashboard', 'manage_products', 'manage_categories', 'manage_collections',
        'manage_orders', 'manage_customers', 'manage_reviews'
    )
    ON CONFLICT ON CONSTRAINT role_permissions_role_id_permission_id_key DO NOTHING;

    -- 2.4 INVENTORY MANAGER (Product viewing, variants, inventory)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_inventory, p.id FROM public.permissions p
    WHERE p.name IN (
        'manage_products', 'manage_variants', 'manage_inventory'
    )
    ON CONFLICT ON CONSTRAINT role_permissions_role_id_permission_id_key DO NOTHING;

    -- 2.5 CUSTOMER SUPPORT (Orders, customers, reviews)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_support, p.id FROM public.permissions p
    WHERE p.name IN (
        'manage_orders', 'manage_customers', 'manage_reviews'
    )
    ON CONFLICT ON CONSTRAINT role_permissions_role_id_permission_id_key DO NOTHING;

    -- 2.6 MARKETING (Coupons, banners, collections, catalog-view)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_marketing, p.id FROM public.permissions p
    WHERE p.name IN (
        'manage_dashboard', 'manage_products', 'manage_collections',
        'manage_coupons', 'manage_banners'
    )
    ON CONFLICT ON CONSTRAINT role_permissions_role_id_permission_id_key DO NOTHING;

END $$;

COMMIT;
