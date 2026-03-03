-- Migration: Add is_starred to contact_submissions table
-- Description: Supports starring/favoriting actions in the admin backend

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contact_submissions' AND column_name = 'is_starred'
    ) THEN
        ALTER TABLE contact_submissions ADD COLUMN is_starred BOOLEAN DEFAULT false;
    END IF;
END $$;
