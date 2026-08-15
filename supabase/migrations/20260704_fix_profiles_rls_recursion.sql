-- ========================================================
-- MIGRATION: FIX PROFILES & ADMIN_USERS RLS INFINITE RECURSION
-- File: supabase/migrations/20260704_fix_profiles_rls_recursion.sql
-- Description: Establishes non-recursive, production-safe RLS policies
--              for public.profiles and public.admin_users using
--              a SECURITY DEFINER helper function.
-- ========================================================

-- 1. SECURITY DEFINER Admin Helper Function (Bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- 2. Clean up existing policies on public.profiles
DROP POLICY IF EXISTS "Profiles Select Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Delete Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Select Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Delete Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Admin Access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;

-- 3. Re-create production-safe RLS policies for public.profiles
-- SELECT: Users can select their own profile, or admins can select any profile
CREATE POLICY "Profiles Select Policy" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid() OR public.is_admin_user()
  );

-- INSERT: Users can insert their own profile matching auth.uid()
CREATE POLICY "Profiles Insert Policy" ON public.profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
  );

-- UPDATE: Users can update their own profile, or admins can update any profile
CREATE POLICY "Profiles Update Policy" ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid() OR public.is_admin_user()
  )
  WITH CHECK (
    id = auth.uid() OR public.is_admin_user()
  );

-- DELETE: Users can delete their own profile, or admins can delete any profile
CREATE POLICY "Profiles Delete Policy" ON public.profiles
  FOR DELETE
  USING (
    id = auth.uid() OR public.is_admin_user()
  );

-- 4. Clean up existing policies on public.admin_users
DROP POLICY IF EXISTS "Admin Users Select" ON public.admin_users;
DROP POLICY IF EXISTS "Admin Users Select Own" ON public.admin_users;
DROP POLICY IF EXISTS "Admin Users Admin Manage" ON public.admin_users;
DROP POLICY IF EXISTS "Admin Users All" ON public.admin_users;

-- 5. Re-create production-safe RLS policies for public.admin_users
-- Direct equality check (user_id = auth.uid()) prevents recursive policy lookup
CREATE POLICY "Admin Users Select Own" ON public.admin_users
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Admin manage policy uses SECURITY DEFINER function which bypasses RLS
CREATE POLICY "Admin Users Admin Manage" ON public.admin_users
  FOR ALL
  USING (
    public.is_admin_user()
  );
