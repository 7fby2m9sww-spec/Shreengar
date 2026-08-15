-- Migration: Fix Collections Public RLS Policies (Sprint 3.3.3)
BEGIN;

-- 1. Drop existing faulty policies on public.collections
DROP POLICY IF EXISTS "Public Read Collections" ON public.collections;
DROP POLICY IF EXISTS "Staff Modify Collections" ON public.collections;

-- 2. Drop existing faulty policies on public.product_collections
DROP POLICY IF EXISTS "Public Read Product Collections" ON public.product_collections;
DROP POLICY IF EXISTS "Staff Modify Product Collections" ON public.product_collections;

-- 3. Recreate RLS SELECT policy for public.collections (stores only published collections)
CREATE POLICY "collections_public_read_published"
ON public.collections
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- 4. Recreate RLS INSERT, UPDATE, DELETE policy for staff on public.collections
CREATE POLICY "collections_staff_modify"
ON public.collections
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 5. Recreate RLS SELECT policy for public.product_collections (stores only published product associations)
CREATE POLICY "product_collections_public_read_published"
ON public.product_collections
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections c 
        WHERE c.id = collection_id AND c.status = 'published'
    )
);

-- 6. Recreate RLS INSERT, UPDATE, DELETE policy for staff on public.product_collections
CREATE POLICY "product_collections_staff_modify"
ON public.product_collections
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

COMMIT;
