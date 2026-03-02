-- Migration 003: Add media fields to projects table
-- Run this if the initial migration didn't include these columns

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS venue          text;

COMMENT ON COLUMN public.projects.description      IS 'Public-facing project description';
COMMENT ON COLUMN public.projects.cover_image_url  IS 'Main cover image for portfolio display';
COMMENT ON COLUMN public.projects.gallery_urls     IS 'Array of gallery image URLs';
COMMENT ON COLUMN public.projects.venue            IS 'Event venue / location string';
