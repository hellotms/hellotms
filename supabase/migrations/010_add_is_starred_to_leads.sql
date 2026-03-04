-- Migration: Add is_starred to leads
-- Description: Supports the newly requested star logic for the Contact Form (formerly Leads)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'is_starred'
    ) THEN
        ALTER TABLE leads ADD COLUMN is_starred BOOLEAN DEFAULT false;
    END IF;
END $$;
