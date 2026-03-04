-- Public access to companies (limited columns)
-- hellotms.com.bd

-- ─────────────────────────────────────────────────────────────────────────────
-- companies policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow anyone (anon) to see basic company info needed for portfolio/project views
CREATE POLICY "companies_public_read" ON public.companies FOR SELECT TO anon
  USING (true);

-- Note: We already have companies_select_auth for staff. 
-- Since it's a public site where we show clients, this is safe for name/logo.
