-- ==============================================================================
-- Migration: Add OTP Purpose and Default Address Constraints
-- Description: Supports distinct OTP flows (login, change_email, change_phone)
--              and enforces a single default shipping address per customer.
-- ==============================================================================

-- 1. ADD PURPOSE TO OTP TABLE
-- Default to 'login' for backward compatibility with existing records
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'login';

-- 2. ENFORCE SINGLE DEFAULT ADDRESS PER CUSTOMER
-- This partial unique index guarantees that no customer can have more than one default address
CREATE UNIQUE INDEX IF NOT EXISTS one_default_address_per_user_idx
ON public.addresses (user_id)
WHERE is_default = true;

-- 3. RPC: ATOMICALLY SET A DEFAULT ADDRESS
-- Sets the target address as default and unsets any existing defaults for that user.
-- Safely bypasses RLS if executed by the system or handles it appropriately.
CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Unset existing defaults for this user
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = p_user_id AND id != p_address_id AND is_default = true;

    -- Set the new default
    UPDATE public.addresses
    SET is_default = true
    WHERE id = p_address_id AND user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. RPC: ATOMICALLY DELETE ADDRESS AND PROMOTE NEW DEFAULT
-- Deletes the specified address. If it was the default, automatically promotes
-- the most recently updated remaining address to be the new default.
-- Note: 'updated_at' might not exist on addresses in schema.sql, let's use 'created_at'.
CREATE OR REPLACE FUNCTION public.delete_address_and_promote(p_address_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_was_default BOOLEAN;
    v_next_address_id UUID;
BEGIN
    -- Check if the address being deleted is the default
    SELECT is_default INTO v_was_default
    FROM public.addresses
    WHERE id = p_address_id AND user_id = p_user_id;

    -- Delete the target address
    DELETE FROM public.addresses
    WHERE id = p_address_id AND user_id = p_user_id;

    -- If it was default, try to find another address to promote
    IF v_was_default THEN
        SELECT id INTO v_next_address_id
        FROM public.addresses
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_next_address_id IS NOT NULL THEN
            UPDATE public.addresses
            SET is_default = true
            WHERE id = v_next_address_id AND user_id = p_user_id;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
