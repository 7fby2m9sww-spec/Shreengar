-- =========================================================================================
-- MIGRATION B: CLEANUP LEGACY RBAC MAPPINGS
-- File: supabase/migrations/20260715_cleanup_legacy_rbac_mappings.sql
-- Description: Removes obsolete legacy mappings from the six known system roles.
-- Custom mappings and legacy permission definitions are strictly preserved.
-- =========================================================================================

BEGIN;

DO $$
DECLARE
    v_role_admin UUID;
    v_role_manager UUID;
    v_role_inventory UUID;
    v_role_support UUID;
    v_role_marketing UUID;
BEGIN
    SELECT id INTO v_role_admin FROM public.roles WHERE code = 'admin';
    SELECT id INTO v_role_manager FROM public.roles WHERE code = 'manager';
    SELECT id INTO v_role_inventory FROM public.roles WHERE code = 'inventory_manager';
    SELECT id INTO v_role_support FROM public.roles WHERE code = 'customer_support';
    SELECT id INTO v_role_marketing FROM public.roles WHERE code = 'marketing';

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

    -- Remove manage_orders from all standard roles (replaced by granular order permissions)
    DELETE FROM public.role_permissions
    WHERE role_id IN (v_role_admin, v_role_manager, v_role_inventory, v_role_support, v_role_marketing)
      AND permission_id IN (SELECT id FROM public.permissions WHERE name = 'manage_orders');

    -- Remove manage_dashboard from all standard roles (replaced by view_dashboard)
    DELETE FROM public.role_permissions
    WHERE role_id IN (v_role_admin, v_role_manager, v_role_inventory, v_role_support, v_role_marketing)
      AND permission_id IN (SELECT id FROM public.permissions WHERE name = 'manage_dashboard');

END $$;

COMMIT;
