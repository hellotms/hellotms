-- Migration 023: Add quantity and face_value (sell price) to ledger_entries
-- These are optional admin-only fields that help pre-fill invoice line items with
-- correct quantity and sell price when generating invoices from project expenses.

ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS quantity    numeric(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS face_value  numeric(14,2);   -- optional sell/quote price per unit
