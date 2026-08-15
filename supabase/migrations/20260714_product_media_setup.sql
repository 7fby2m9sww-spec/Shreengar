-- Supabase Migration: Product Media Setup (Sprint 2.2)

-- 1. Upgrade product_images table to match target production schema
ALTER TABLE public.product_images 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Create index on foreign key product_id for performance optimization
CREATE INDEX IF NOT EXISTS idx_product_images_product_id 
ON public.product_images (product_id);

-- 3. Create partial unique index to enforce exactly one featured image per product
CREATE UNIQUE INDEX IF NOT EXISTS unique_featured_image_per_product 
ON public.product_images (product_id) 
WHERE (is_featured = true);

-- 4. Enable RLS and define SELECT and ALL policies
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product images" ON public.product_images;
CREATE POLICY "Public read product images" ON public.product_images
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage product images" ON public.product_images;
CREATE POLICY "Admins manage product images" ON public.product_images
FOR ALL TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 5. Define Storage bucket RLS policies for 'products' bucket
-- Note: 'products' bucket already exists, so we only need to configure its object storage policies.
DROP POLICY IF EXISTS "Public read storage images" ON storage.objects;
CREATE POLICY "Public read storage images" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Admins manage storage images" ON storage.objects;
CREATE POLICY "Admins manage storage images" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'products' AND public.is_admin_user())
WITH CHECK (bucket_id = 'products' AND public.is_admin_user());
