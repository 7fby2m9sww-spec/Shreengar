-- Migration: Product Variants & Inventory Database Alignment (Sprint 2.3.1 - Refactored)
-- Description: Implement a normalized, single-source-of-truth inventory architecture aligned with enterprise standards.

-- 1. Upgrade product_variants table structure
-- Contains ONLY variant attributes. No stock/inventory counters.
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS size VARCHAR(50),
ADD COLUMN IF NOT EXISTS color_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS color_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS price_override NUMERIC(10, 2);

-- 2. Upgrade inventory table structure
-- Single source of truth for stock quantities.
-- Keeps quantity column to prevent remote data corruption.
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS reserved_stock INT DEFAULT 0 CHECK (reserved_stock >= 0),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100); -- Preserved temporarily for backward compatibility with frontend table selections

-- 3. Create helper function to automatically sync variant SKU to inventory record
CREATE OR REPLACE FUNCTION public.sync_inventory_sku()
RETURNS TRIGGER AS $$
BEGIN
    SELECT sku INTO NEW.sku
    FROM public.product_variants
    WHERE id = NEW.variant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_inventory_sku ON public.inventory;
CREATE TRIGGER trg_sync_inventory_sku
BEFORE INSERT OR UPDATE OF variant_id ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_sku();

-- 4. Enable RLS and define security policies for the inventory table
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage inventory" ON public.inventory;
CREATE POLICY "Admins manage inventory" ON public.inventory
FOR ALL TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
