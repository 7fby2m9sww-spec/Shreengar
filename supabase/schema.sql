-- ========================================================
-- SHREENGAR PRODUCTION DATABASE SCHEMA (POSTGRESQL / SUPABASE)
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    gender VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure gender column exists on existing profiles tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 PRODUCT FAMILIES TABLE
CREATE TABLE IF NOT EXISTS public.product_families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    internal_reference TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(10, 2) CHECK (compare_at_price >= price),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
    product_family_id UUID REFERENCES public.product_families(id) ON DELETE SET NULL,
    primary_color_id UUID REFERENCES public.colors(id) ON DELETE SET NULL,
    colorway_sort_order INT NOT NULL DEFAULT 0,
    brand VARCHAR(100) DEFAULT 'Shreengar',
    fabric VARCHAR(100),
    occasion VARCHAR(100),
    care_instructions TEXT,
    description TEXT NOT NULL,
    details TEXT[] DEFAULT '{}',
    images TEXT[] NOT NULL DEFAULT '{}',
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    meta_title VARCHAR(255),
    meta_description TEXT,
    show_color_option BOOLEAN NOT NULL DEFAULT FALSE,
    storefront_default_color_id UUID REFERENCES public.colors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(50),
    size VARCHAR(20),
    price NUMERIC(10, 2),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID UNIQUE NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    reserved_stock INT DEFAULT 0 CHECK (reserved_stock >= 0),
    reorder_level INT DEFAULT 5,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    is_default BOOLEAN DEFAULT FALSE,
    is_default_billing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_email VARCHAR(255),
    shipping_address_id UUID REFERENCES public.addresses(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded')),
    subtotal NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    shipping_fee NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    coupon_code VARCHAR(50),
    payment_method VARCHAR(50) DEFAULT 'cod',
    payment_status VARCHAR(50) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    courier_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    variant_name VARCHAR(100),
    sku VARCHAR(100),
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('upi', 'card', 'netbanking', 'cod', 'online')),
    transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    amount NUMERIC(10, 2) NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CART TABLE
CREATE TABLE IF NOT EXISTS public.cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 14. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_avatar TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    comment TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. BLOGS TABLE
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    cover_image TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. HOMEPAGE BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.homepage_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    cta_text VARCHAR(100) NOT NULL,
    cta_link VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_cart_value NUMERIC(10, 2) DEFAULT 0,
    max_discount_amount NUMERIC(10, 2),
    usage_limit INT,
    used_count INT DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. COUPON USAGE TABLE
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ROLES TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Immutable System Roles
INSERT INTO public.roles (name, display_name, code, description, is_system)
VALUES
    ('Super Admin', 'Super Admin', 'super_admin', 'Full un-restricted administrative access across all store modules.', true),
    ('Admin', 'Admin', 'admin', 'Full store catalog, order fulfillment, and banner management.', true),
    ('Manager', 'Manager', 'manager', 'Order management, customer relations, and content publishing.', true),
    ('Inventory Manager', 'Inventory Manager', 'inventory_manager', 'Stock adjustment, warehouse bin management, and supplier ordering.', true),
    ('Customer Support', 'Customer Support', 'customer_support', 'Order tracking, customer inquiries, and review moderation.', true),
    ('Marketing', 'Marketing', 'marketing', 'Promotional coupons, banner slides, and blog publishing.', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system;

-- 21. PERMISSIONS TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT
);

-- 22. ROLE PERMISSIONS TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- 23. ADMIN USERS TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role_id UUID NOT NULL REFERENCES public.roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. ACTIVITY LOGS TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- AUTOMATIC USER REGISTRATION TRIGGER & FUNCTION FOR PROFILES
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name VARCHAR(255);
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1),
        'Customer'
    );

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        NEW.phone,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- ATOMIC INVENTORY TRANSACTION FUNCTION
-- ========================================================
CREATE OR REPLACE FUNCTION public.deduct_inventory_atomic(
    p_variant_id UUID,
    p_quantity INT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_stock INT;
BEGIN
    SELECT stock INTO v_current_stock
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RETURN FALSE;
    END IF;

    UPDATE public.product_variants
    SET stock = stock - p_quantity
    WHERE id = p_variant_id;

    UPDATE public.inventory
    SET stock = stock - p_quantity,
        updated_at = NOW()
    WHERE variant_id = p_variant_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ========================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES — RECURSION IMMUNE
-- ========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security Definer Admin Helper (Bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. PROFILES POLICIES (Strict Non-Recursive: Direct Equality + SECURITY DEFINER Admin Helper)
DROP POLICY IF EXISTS "Profiles Select Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Delete Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Select Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Insert Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Delete Policy" ON public.profiles;

CREATE POLICY "Profiles Select Policy" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin_user());
CREATE POLICY "Profiles Insert Policy" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles Update Policy" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_admin_user()) WITH CHECK (id = auth.uid() OR public.is_admin_user());
CREATE POLICY "Profiles Delete Policy" ON public.profiles FOR DELETE USING (id = auth.uid() OR public.is_admin_user());

-- 2. ADMIN USERS POLICIES (Strict Non-Recursive: Direct Equality + SECURITY DEFINER Admin Helper)
DROP POLICY IF EXISTS "Admin Users Select" ON public.admin_users;
DROP POLICY IF EXISTS "Admin Users Select Own" ON public.admin_users;
DROP POLICY IF EXISTS "Admin Users Admin Manage" ON public.admin_users;

CREATE POLICY "Admin Users Select Own" ON public.admin_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin Users Admin Manage" ON public.admin_users FOR ALL USING (public.is_admin_user());

-- 3. ROLES POLICIES
DROP POLICY IF EXISTS "Roles Read Policy" ON public.roles;
DROP POLICY IF EXISTS "Roles Admin Manage Policy" ON public.roles;

CREATE POLICY "Roles Read Policy" ON public.roles FOR SELECT USING (true);

-- 3. PRODUCTS & CATALOG POLICIES
CREATE POLICY "Public Read Active Products" ON public.products FOR SELECT USING (is_active = true OR public.is_admin_user());
CREATE POLICY "Staff Modify Products" ON public.products FOR ALL USING (public.is_admin_user());

CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Staff Modify Categories" ON public.categories FOR ALL USING (public.is_admin_user());
CREATE POLICY "Public Read Collections" ON public.collections FOR SELECT USING (true);
CREATE POLICY "Staff Modify Collections" ON public.collections FOR ALL USING (public.is_admin_user());
CREATE POLICY "Public Read Product Variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Staff Modify Variants" ON public.product_variants FOR ALL USING (public.is_admin_user());

-- 4. CART & WISHLIST & ADDRESSES POLICIES
CREATE POLICY "Customer Access Own Cart" ON public.cart FOR ALL USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (session_id IS NOT NULL)
);
CREATE POLICY "Customer Access Own Wishlist" ON public.wishlist FOR ALL USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);
CREATE POLICY "Customer Access Own Addresses" ON public.addresses FOR ALL USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_admin_user()
);

-- 5. ORDERS & REVIEWS POLICIES
CREATE POLICY "Customer Read Own Orders" ON public.orders FOR SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_admin_user()
);
CREATE POLICY "Customer Create Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff Manage Orders" ON public.orders FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Public Read Approved Reviews" ON public.reviews FOR SELECT USING (status = 'approved' OR public.is_admin_user());
CREATE POLICY "Customer Create Review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Staff Moderate Reviews" ON public.reviews FOR ALL USING (public.is_admin_user());

-- 6. BANNERS & BLOGS & COUPONS POLICIES
CREATE POLICY "Public Read Active Banners" ON public.homepage_banners FOR SELECT USING (is_active = true OR public.is_admin_user());
CREATE POLICY "Staff Modify Banners" ON public.homepage_banners FOR ALL USING (public.is_admin_user());
CREATE POLICY "Public Read Active Coupons" ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin_user());
CREATE POLICY "Staff Modify Coupons" ON public.coupons FOR ALL USING (public.is_admin_user());
