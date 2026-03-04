-- 012_add_invoice_pad_url.sql

-- Add invoice_pad_url to site_settings to store the default background image for invoices
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS invoice_pad_url text;

-- Ensure the singleton row exists (it should, but just in case)
INSERT INTO public.site_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;
