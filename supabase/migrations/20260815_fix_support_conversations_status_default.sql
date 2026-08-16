-- Migration: Fix support_conversations status default and NOT NULL constraint
-- Date: 2026-08-15

-- 1. Update any existing NULL status values to 'open'
UPDATE public.support_conversations 
SET status = 'open' 
WHERE status IS NULL OR status = '';

-- 2. Alter column status to SET DEFAULT 'open'
ALTER TABLE public.support_conversations 
ALTER COLUMN status SET DEFAULT 'open';

-- 3. Add NOT NULL constraint on status column
ALTER TABLE public.support_conversations 
ALTER COLUMN status SET NOT NULL;

-- 4. Update any existing NULL topic or subject values
UPDATE public.support_conversations 
SET topic = 'General' 
WHERE topic IS NULL OR topic = '';

UPDATE public.support_conversations 
SET subject = 'Support Request' 
WHERE subject IS NULL OR subject = '';
