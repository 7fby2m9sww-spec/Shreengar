-- Migration: Create Inventory Transactions (History) Table (Sprint 2.3.3)
-- Description: Track every inventory adjustment, receive shipment, manual update, or return audit trail.

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    change_amount INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for high-performance inventory logs lookup
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id 
ON public.inventory_transactions (inventory_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Administrators can read and manage inventory transactions
DROP POLICY IF EXISTS "Admins manage inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Admins manage inventory transactions" ON public.inventory_transactions
FOR ALL TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
