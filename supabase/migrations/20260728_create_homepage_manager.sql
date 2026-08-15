-- Migration: Create Homepage Manager Schema (Sprint 3.3.4)
BEGIN;

-- 1. Create homepage_sections table
CREATE TABLE IF NOT EXISTS public.homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(50) NOT NULL, -- 'hero_banner', 'category_grid', 'collections', 'products', 'blog_articles'
    title VARCHAR(255),
    subtitle TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 1,
    desktop_enabled BOOLEAN DEFAULT TRUE,
    mobile_enabled BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create homepage_section_items table
CREATE TABLE IF NOT EXISTS public.homepage_section_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'collection', 'product', 'banner', 'blog'
    entity_id VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 1,
    is_enabled BOOLEAN DEFAULT TRUE,
    custom_title VARCHAR(255),
    custom_subtitle TEXT,
    custom_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_section_items ENABLE ROW LEVEL SECURITY;

-- 4. Set up RLS Policies for homepage_sections
DROP POLICY IF EXISTS "Public Read Active Homepage Sections" ON public.homepage_sections;
CREATE POLICY "Public Read Active Homepage Sections" ON public.homepage_sections
    FOR SELECT
    TO anon, authenticated
    USING (
        is_enabled = true 
        AND (starts_at IS NULL OR starts_at <= NOW()) 
        AND (ends_at IS NULL OR ends_at >= NOW())
    );

-- 5. Set up RLS Policies for homepage_section_items
DROP POLICY IF EXISTS "Public Read Active Homepage Section Items" ON public.homepage_section_items;
CREATE POLICY "Public Read Active Homepage Section Items" ON public.homepage_section_items
    FOR SELECT
    TO anon, authenticated
    USING (is_enabled = true);

-- Note: Staff write policies are not needed as admin mutations are executed
-- via server actions utilizing createAdminClient() (which uses service_role key to bypass RLS).

-- 6. Insert default homepage sections matching the current storefront homepage with static UUIDs for rerun safety
INSERT INTO public.homepage_sections (id, section_type, title, subtitle, is_enabled, sort_order, settings)
VALUES
    ('a1b2c3d4-0001-4000-a000-000000000001', 'hero_banner', 'Royal Indian Ethnic Couture', 'Discover timeless Anarkalis, silk sarees, and handcrafted ethnic wear.', true, 10, '{}'::jsonb),
    ('a1b2c3d4-0002-4000-a000-000000000002', 'category_grid', 'Shop by Category', 'Curated Styles', true, 20, '{}'::jsonb),
    ('a1b2c3d4-0003-4000-a000-000000000003', 'collections', 'Featured Collections', 'Handpicked assortments tailored for grand festivities, weddings, and casual luxury.', false, 30, '{}'::jsonb),
    ('a1b2c3d4-0004-4000-a000-000000000004', 'products', 'Bestselling Classics', 'Most Loved', true, 40, '{"filter": "bestsellers"}'::jsonb),
    ('a1b2c3d4-0005-4000-a000-000000000005', 'products', 'New Arrivals 2026', 'Fresh Dropped', true, 50, '{"filter": "new"}'::jsonb),
    ('a1b2c3d4-0006-4000-a000-000000000006', 'blog_articles', 'From the Shreengar Blog', 'Style Journal', true, 60, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

COMMIT;
