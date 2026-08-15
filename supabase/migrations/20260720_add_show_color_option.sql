-- Add show_color_option column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS show_color_option BOOLEAN NOT NULL DEFAULT false;

-- Add storefront_default_color_id column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS storefront_default_color_id UUID REFERENCES public.colors(id) ON DELETE SET NULL;

