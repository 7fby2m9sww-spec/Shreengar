-- Migration: Fix Inventory stock_status Consistency (Sprint 3)
-- Description: Corrects the stock_status calculation trigger to use available quantity safely without accessing the database-generated column available_quantity.

-- 1. Drop existing potential triggers on the inventory table
DROP TRIGGER IF EXISTS trg_sync_inventory_status ON public.inventory;
DROP TRIGGER IF EXISTS trg_update_stock_status ON public.inventory;
DROP TRIGGER IF EXISTS trg_sync_inventory_sku ON public.inventory;
DROP TRIGGER IF EXISTS trg_sync_inventory_fields ON public.inventory;

-- 2. Create unified trigger function for both SKU and stock_status sync
CREATE OR REPLACE FUNCTION public.sync_inventory_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_avail INT;
BEGIN
    -- 1. Sync SKU from product_variants
    SELECT sku INTO NEW.sku
    FROM public.product_variants
    WHERE id = NEW.variant_id;

    -- 2. Calculate available stock safely using GREATEST to avoid negative values
    v_avail := GREATEST(NEW.quantity - NEW.reserved_quantity, 0);

    -- 3. Assign stock_status based on the corrected formula
    IF v_avail <= 0 THEN
        NEW.stock_status := 'out_of_stock';
    ELSIF v_avail <= COALESCE(NEW.low_stock_threshold, 5) THEN
        NEW.stock_status := 'low_stock';
    ELSE
        NEW.stock_status := 'in_stock';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create a single unified BEFORE INSERT OR UPDATE trigger
CREATE TRIGGER trg_sync_inventory_fields
BEFORE INSERT OR UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_fields();
