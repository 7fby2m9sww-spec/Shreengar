-- =========================================================================================
-- MIGRATION: SEED RBAC GRANULARITY & ROLE-PERMISSION MAPPINGS (PHASE 2)
-- File: supabase/migrations/20260715_seed_rbac_granularity.sql
-- Description: Idempotent seed for granular view/manage permissions with strict safeguards.
-- =========================================================================================

BEGIN;

-- 1. SEED NEW GRANULAR PERMISSIONS
INSERT INTO public.permissions (name, module, display_name, description, is_system)
VALUES 
    ('view_dashboard', 'Dashboard', 'View Dashboard', 'Access dashboard analytics', true),
    ('view_orders', 'Orders', 'View Orders', 'View order details and lists', true),
    ('manage_order_status', 'Orders', 'Manage Order Status', 'Update standard order statuses (e.g. shipped)', true),
    ('cancel_orders', 'Orders', 'Cancel Orders', 'Cancel paid orders', true),
    ('refund_orders', 'Orders', 'Refund Orders', 'Issue refunds for orders', true),
    ('view_products', 'Catalog', 'View Products', 'View product details', true),
    ('manage_products', 'Catalog', 'Manage Products', 'Create, edit, delete products', true),
    ('view_categories', 'Catalog', 'View Categories', 'View category details', true),
    ('manage_categories', 'Catalog', 'Manage Categories', 'Create, edit, delete categories', true),
    ('view_collections', 'Catalog', 'View Collections', 'View collection details', true),
    ('manage_collections', 'Catalog', 'Manage Collections', 'Create, edit, delete collections', true),
    ('view_variants', 'Catalog', 'View Variants', 'View variant details', true),
    ('manage_variants', 'Catalog', 'Manage Variants', 'Manage variant SKU, size, color', true),
    ('view_inventory', 'Inventory', 'View Inventory', 'View stock levels', true),
    ('manage_inventory', 'Inventory', 'Manage Inventory', 'Adjust stock levels', true),
    ('view_customers', 'Customers', 'View Customers', 'View customer profiles', true),
    ('manage_customers', 'Customers', 'Manage Customers', 'Edit customer identities and details', true),
    ('view_reviews', 'Reviews', 'View Reviews', 'View product reviews', true),
    ('manage_reviews', 'Reviews', 'Manage Reviews', 'Moderate product reviews', true),
    ('view_coupons', 'Marketing', 'View Coupons', 'View discount coupons', true),
    ('manage_coupons', 'Marketing', 'Manage Coupons', 'Create and manage coupons', true),
    ('view_banners', 'Marketing', 'View Banners', 'View homepage banners', true),
    ('manage_banners', 'Marketing', 'Manage Banners', 'Manage homepage banners', true),
    ('view_admin_users', 'System', 'View Admin Users', 'View admin staff list', true),
    ('manage_admin_users', 'System', 'Manage Admin Users', 'Add or remove admin staff', true),
    ('view_roles', 'System', 'View Roles', 'View custom roles', true),
    ('manage_roles', 'System', 'Manage Roles', 'Create and manage custom roles', true),
    ('view_permissions', 'System', 'View Permissions', 'View the permission catalog', true),
    ('manage_permissions', 'System', 'Manage Permissions', 'Manage permission settings', true),
    ('view_security', 'System', 'View Security', 'View security settings', true),
    ('manage_security', 'System', 'Manage Security', 'Modify security settings', true),
    ('view_activity_logs', 'System', 'View Activity Logs', 'View audit logs', true)
ON CONFLICT (name) DO UPDATE 
SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    module = EXCLUDED.module;


-- 2. RESOLVE ROLES AND ASSERT THEY EXIST
DO $$
DECLARE
    v_role_super_admin UUID;
    v_role_admin UUID;
    v_role_manager UUID;
    v_role_inventory UUID;
    v_role_support UUID;
    v_role_marketing UUID;
BEGIN
    SELECT id INTO v_role_super_admin FROM public.roles WHERE code = 'super_admin';
    IF v_role_super_admin IS NULL THEN RAISE EXCEPTION 'Required system role missing: super_admin'; END IF;

    SELECT id INTO v_role_admin FROM public.roles WHERE code = 'admin';
    IF v_role_admin IS NULL THEN RAISE EXCEPTION 'Required system role missing: admin'; END IF;

    SELECT id INTO v_role_manager FROM public.roles WHERE code = 'manager';
    IF v_role_manager IS NULL THEN RAISE EXCEPTION 'Required system role missing: manager'; END IF;

    SELECT id INTO v_role_inventory FROM public.roles WHERE code = 'inventory_manager';
    IF v_role_inventory IS NULL THEN RAISE EXCEPTION 'Required system role missing: inventory_manager'; END IF;

    SELECT id INTO v_role_support FROM public.roles WHERE code = 'customer_support';
    IF v_role_support IS NULL THEN RAISE EXCEPTION 'Required system role missing: customer_support'; END IF;

    SELECT id INTO v_role_marketing FROM public.roles WHERE code = 'marketing';
    IF v_role_marketing IS NULL THEN RAISE EXCEPTION 'Required system role missing: marketing'; END IF;

    -- 3. INSERT NEW MAPPINGS (Using DO NOTHING to safely ignore existing)
    -- 3.1 SUPER ADMIN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_super_admin, p.id FROM public.permissions p
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- 3.2 ADMIN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_admin, p.id FROM public.permissions p
    WHERE p.name IN (
        'view_dashboard', 'view_products', 'manage_products', 'view_categories', 'manage_categories',
        'view_collections', 'manage_collections', 'view_variants', 'manage_variants',
        'view_inventory', 'manage_inventory', 'view_orders', 'manage_order_status', 'cancel_orders', 'refund_orders',
        'view_customers', 'manage_customers', 'view_coupons', 'manage_coupons', 'view_banners', 'manage_banners',
        'view_reviews', 'manage_reviews'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- 3.3 MANAGER
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_manager, p.id FROM public.permissions p
    WHERE p.name IN (
        'view_dashboard', 'view_products', 'manage_products', 'view_categories', 'manage_categories',
        'view_collections', 'manage_collections', 'view_orders', 'manage_order_status', 
        'view_customers', 'view_reviews', 'manage_reviews'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- 3.4 INVENTORY MANAGER
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_inventory, p.id FROM public.permissions p
    WHERE p.name IN (
        'view_dashboard', 'view_products', 'view_variants', 'view_inventory', 'manage_inventory'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- 3.5 CUSTOMER SUPPORT
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_support, p.id FROM public.permissions p
    WHERE p.name IN (
        'view_dashboard', 'view_orders', 'manage_order_status', 'view_customers', 'view_reviews', 'manage_reviews'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- 3.6 MARKETING
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_marketing, p.id FROM public.permissions p
    WHERE p.name IN (
        'view_dashboard', 'view_products', 'view_categories', 'view_collections', 'manage_collections',
        'view_coupons', 'manage_coupons', 'view_banners', 'manage_banners'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;


    -- 4. CLEANUP OBSOLETE MAPPINGS
    -- We only delete obsolete broad mappings from specific system roles if they exist.
    -- We do NOT delete the permission definitions yet.

    -- Remove manage_products from Inventory Manager and Marketing
    DELETE FROM public.role_permissions
    WHERE role_id IN (v_role_inventory, v_role_marketing)
      AND permission_id IN (SELECT id FROM public.permissions WHERE name = 'manage_products');
      
    -- Remove manage_customers from Customer Support and Manager
    DELETE FROM public.role_permissions
    WHERE role_id IN (v_role_support, v_role_manager)
      AND permission_id IN (SELECT id FROM public.permissions WHERE name = 'manage_customers');

    -- Remove manage_variants from Inventory Manager
    DELETE FROM public.role_permissions
    WHERE role_id = v_role_inventory
      AND permission_id IN (SELECT id FROM public.permissions WHERE name = 'manage_variants');

    -- Remove manage_orders from all roles (replaced entirely by granular codes)
    DELETE FROM public.role_permissions
    WHERE role_id IN (v_role_admin, v_role_manager, v_role_inventory, v_role_support, v_role_marketing)
      AND permission_id IN (SELECT id FROM public.permissions WHERE name = 'manage_orders');

    -- Remove manage_dashboard from all roles (replaced entirely by view_dashboard)
    DELETE FROM public.role_permissions
    WHERE role_id IN (v_role_admin, v_role_manager, v_role_inventory, v_role_support, v_role_marketing)
      AND permission_id IN (SELECT id FROM public.permissions WHERE name = 'manage_dashboard');

END $$;

COMMIT;
