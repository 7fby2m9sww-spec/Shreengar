-- Migration: Add care_instructions and details to products table
-- Created At: 2026-07-18

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS care_instructions TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS details TEXT[] DEFAULT '{}';
