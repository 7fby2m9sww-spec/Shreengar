-- ========================================================
-- SHREENGAR MIGRATION: AUTOMATIC AUTH USER TRIGGER & BACKFILL FOR PROFILES
-- Target Table: public.profiles ONLY
-- ========================================================

-- 1. Create or Replace handle_new_user() Security Definer Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name VARCHAR(255);
BEGIN
    -- Extract full name from raw_user_meta_data or fallback to email username
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1),
        'Customer'
    );

    -- Insert or Update into public.profiles
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

-- 2. Bind Idempotent Trigger on auth.users Table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill Existing Auth Users into public.profiles
INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1), 'Customer'),
    u.phone,
    u.created_at,
    NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
