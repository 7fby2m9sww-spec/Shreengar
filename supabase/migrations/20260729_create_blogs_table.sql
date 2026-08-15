-- Migration: Create Blogs Table for Marketing Blog Module (Sprint 3.3.4)
BEGIN;

-- 1. Create public.blogs table
CREATE TABLE public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL DEFAULT 'Shreengar Team',
    cover_image TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    published_at TIMESTAMPTZ,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- 3. Explicit Table Privileges: Revoke ALL privileges from anon and authenticated, then grant SELECT only
REVOKE ALL PRIVILEGES ON TABLE public.blogs FROM anon, authenticated;
GRANT SELECT ON TABLE public.blogs TO anon, authenticated;

-- 4. Recreate Public Read RLS Policy: Allows reading only published & eligible articles
DROP POLICY IF EXISTS "blogs_public_read_published" ON public.blogs;

CREATE POLICY "blogs_public_read_published"
ON public.blogs
FOR SELECT
TO anon, authenticated
USING (
    is_published = true
    AND (published_at IS NULL OR published_at <= NOW())
);

-- 5. Useful Publication Order Index (UNIQUE slug constraint already creates the slug index)
CREATE INDEX idx_blogs_publication ON public.blogs(is_published, published_at DESC);

-- 6. Blog-specific trigger function to maintain updated_at timestamp on updates
CREATE FUNCTION public.set_blogs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 7. Explicit Function Privileges: Revoke direct execution from PUBLIC
REVOKE ALL ON FUNCTION public.set_blogs_updated_at() FROM PUBLIC;

-- 8. Attach trigger to public.blogs
DROP TRIGGER IF EXISTS set_blogs_updated_at ON public.blogs;

CREATE TRIGGER set_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.set_blogs_updated_at();

COMMIT;
