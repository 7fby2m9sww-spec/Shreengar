-- Migration: Convert coupons.target_customer_ids from TEXT[] to UUID[]
-- Date: 2026-08-15

DO $$
BEGIN
    -- 1. Add temporary UUID[] column if target_customer_ids is currently TEXT[]
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'coupons' 
          AND column_name = 'target_customer_ids' 
          AND data_type = 'ARRAY'
    ) THEN
        -- Add temporary UUID array column
        ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_customer_ids_uuid UUID[] DEFAULT '{}';

        -- Populate target_customer_ids_uuid with valid UUID elements, ignoring empty or malformed strings
        UPDATE public.coupons
        SET target_customer_ids_uuid = ARRAY(
            SELECT elem::uuid 
            FROM unnest(target_customer_ids) AS elem 
            WHERE elem ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
        WHERE target_customer_ids IS NOT NULL AND array_length(target_customer_ids, 1) > 0;

        -- Drop old TEXT[] column
        ALTER TABLE public.coupons DROP COLUMN IF EXISTS target_customer_ids;

        -- Rename temporary column to target_customer_ids
        ALTER TABLE public.coupons RENAME COLUMN target_customer_ids_uuid TO target_customer_ids;
    ELSE
        -- If target_customer_ids does not exist yet, add it directly as UUID[]
        ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_customer_ids UUID[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Recreate GIN index for high-performance array lookup
DROP INDEX IF EXISTS idx_coupons_target_customer_ids;
DROP INDEX IF EXISTS coupons_target_customer_ids_gin;

CREATE INDEX coupons_target_customer_ids_gin ON public.coupons USING GIN (target_customer_ids);
