-- Migration 005: Missing tables and columns for The Marketing Solution
-- Run this in Supabase SQL Editor

-- ─── 1. Add missing 'label' column to roles ──────────────────────────────────
-- The roles table was created without a human-readable label column.
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS label text;

-- Fill label from name for existing rows
UPDATE public.roles SET label = initcap(replace(name, '_', ' ')) WHERE label IS NULL;

-- Make it NOT NULL after populating
ALTER TABLE public.roles ALTER COLUMN label SET NOT NULL;

-- ─── 2. Create project_media table ───────────────────────────────────────────
-- For per-photo gallery storage (used by Gallery tab in admin with Supabase Storage)
CREATE TABLE IF NOT EXISTS public.project_media (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  path        text NOT NULL,          -- storage path in project-media bucket
  url         text NOT NULL,          -- public URL
  caption     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_media_project_id_idx ON public.project_media(project_id);
CREATE INDEX IF NOT EXISTS project_media_created_at_idx ON public.project_media(created_at DESC);

-- ─── 3. RLS for project_media ─────────────────────────────────────────────────
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public portfolio)
CREATE POLICY "project_media_select_all"
  ON public.project_media FOR SELECT USING (true);

-- Only authenticated staff can insert / delete
CREATE POLICY "project_media_insert_auth"
  ON public.project_media FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "project_media_delete_auth"
  ON public.project_media FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ─── 4. Supabase Storage bucket ───────────────────────────────────────────────
-- Run this separately in the Supabase Storage UI or via API:
-- Bucket name: project-media
-- Public: true
-- Allowed MIME types: image/*
-- Max file size: 10 MB

-- ─── 5. Add cover_image_url upload support to projects ───────────────────────
-- cover_image_url already exists (from migration 003), but now it stores
-- a Supabase Storage public URL instead of an external URL.
-- No schema change needed — just the frontend upload logic is updated.

-- ─── 6. Add company logo_url upload support ───────────────────────────────────
-- logo_url already exists in companies table (from initial schema).
-- No schema change needed.
