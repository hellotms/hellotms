-- Migration 007: Add budget and advance_received fields to projects
-- Run this in Supabase SQL Editor

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget          numeric(14,2),
  ADD COLUMN IF NOT EXISTS advance_received numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.projects.budget           IS 'Agreed total project budget from client';
COMMENT ON COLUMN public.projects.advance_received IS 'Advance payment received from client at project creation';
