-- Migration: Create collections enhancements and product assignments (Sprint 3.3.3)
BEGIN;

-- 1. Alter Collections table if columns don't exist
ALTER TABLE public.collections 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seo_description TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add check constraint for status values
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS chk_collections_status;
ALTER TABLE public.collections ADD CONSTRAINT chk_collections_status CHECK (status IN ('draft', 'published', 'archived'));

-- 2. Create join table for product/collection assignments
CREATE TABLE IF NOT EXISTS public.product_collections (
    collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, product_id)
);

-- 3. Enable RLS on product_collections
ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;

-- 4. Set up RLS Policies for product_collections
DROP POLICY IF EXISTS "Public Read Product Collections" ON public.product_collections;
CREATE POLICY "Public Read Product Collections" ON public.product_collections 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.collections c 
            WHERE c.id = collection_id AND c.status = 'published'
        )
    );

DROP POLICY IF EXISTS "Staff Modify Product Collections" ON public.product_collections;
CREATE POLICY "Staff Modify Product Collections" ON public.product_collections 
    FOR ALL USING (public.is_admin_user());

-- 5. Update Collections RLS Policies to filter on status = 'published' for public users
DROP POLICY IF EXISTS "Public Read Collections" ON public.collections;
CREATE POLICY "Public Read Collections" ON public.collections 
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Staff Modify Collections" ON public.collections;
CREATE POLICY "Staff Modify Collections" ON public.collections 
    FOR ALL USING (public.is_admin_user());

COMMIT;
