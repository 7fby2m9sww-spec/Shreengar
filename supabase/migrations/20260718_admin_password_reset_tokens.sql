-- Migration: Create admin_password_reset_tokens table
-- Created At: 2026-07-18

CREATE TABLE IF NOT EXISTS public.admin_password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    CONSTRAINT chk_attempts CHECK (attempts >= 0)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.admin_password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies are created, which restricts all CRUD operations to service_role (createAdminClient) only.

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_admin_reset_tokens_user_id ON public.admin_password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_reset_tokens_email ON public.admin_password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_admin_reset_tokens_expiry_unused ON public.admin_password_reset_tokens(expires_at) WHERE used = false;

-- Atomic Token Claim Function
CREATE OR REPLACE FUNCTION public.claim_admin_password_reset_token(p_token_hash TEXT)
RETURNS TABLE(r_user_id UUID, r_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.admin_password_reset_tokens
    SET used = true,
        used_at = now()
    WHERE id = (
        SELECT id
        FROM public.admin_password_reset_tokens
        WHERE token_hash = p_token_hash
          AND used = false
          AND expires_at > now()
          AND attempts < 5
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING user_id, id;
END;
$$;

-- Revoke execution from public, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.claim_admin_password_reset_token(TEXT) FROM public, anon, authenticated;

-- Grant execution to service_role
GRANT EXECUTE ON FUNCTION public.claim_admin_password_reset_token(TEXT) TO service_role;
