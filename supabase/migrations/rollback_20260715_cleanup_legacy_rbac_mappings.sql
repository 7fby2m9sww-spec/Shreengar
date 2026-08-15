-- =========================================================================================
-- ROLLBACK MIGRATION: RESTORE LEGACY RBAC MAPPINGS
-- File: supabase/migrations/rollback_20260715_cleanup_legacy_rbac_mappings.sql
-- Description: Restores every legacy mapping removed by Migration B.
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

    -- Restore manage_products
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_inventory, id FROM public.permissions WHERE name = 'manage_products'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_marketing, id FROM public.permissions WHERE name = 'manage_products'
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Restore manage_customers
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_support, id FROM public.permissions WHERE name = 'manage_customers'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_manager, id FROM public.permissions WHERE name = 'manage_customers'
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Restore manage_variants
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_inventory, id FROM public.permissions WHERE name = 'manage_variants'
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Restore manage_orders
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r, public.permissions p
    WHERE r.code IN ('admin', 'manager', 'inventory_manager', 'customer_support', 'marketing')
      AND p.name = 'manage_orders'
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Restore manage_dashboard
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r, public.permissions p
    WHERE r.code IN ('admin', 'manager', 'inventory_manager', 'customer_support', 'marketing')
      AND p.name = 'manage_dashboard'
    ON CONFLICT (role_id, permission_id) DO NOTHING;

END $$;

COMMIT;
