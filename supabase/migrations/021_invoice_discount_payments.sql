-- Migration 021: Add discount and notes to invoices table
-- These fields support the new invoice creation flow with discount (flat or %) and custom notes.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_type text CHECK (discount_type IN ('flat','percent')) DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS discount_value numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;
