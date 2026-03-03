-- 006: Phase 2 additions
-- ── contact_submissions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  phone         text,
  company       text,
  message       text NOT NULL,
  service       text,
  status        text NOT NULL DEFAULT 'new',   -- new | seen | replied
  replied_by    uuid REFERENCES public.profiles(id),
  replied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admin/staff) can view contact submissions
CREATE POLICY "Admins can view contact submissions"
  ON public.contact_submissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Public can insert (from contact form)
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

-- ── profiles: add must_change_password + profile fields ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS bio                 text;

-- ── audit_logs: ensure entity_id is uuid or text (flex) ──────────────────────
-- (audit_logs already exists from migration 001 — just verifying columns)
-- No change needed if entity_id is already text or uuid.
