-- 013_add_invoice_pad_margins.sql

-- Add margin columns to site_settings for invoice pad layout control
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS pad_margin_top integer DEFAULT 150,
ADD COLUMN IF NOT EXISTS pad_margin_bottom integer DEFAULT 100;
