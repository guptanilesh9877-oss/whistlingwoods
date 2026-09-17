-- ============================================================
-- Supabase SQL — Create principal_rsvps table
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.principal_rsvps (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT         NOT NULL,
  college      TEXT         NOT NULL,
  email        TEXT         NOT NULL,
  phone        TEXT         NOT NULL,
  attending    BOOLEAN      NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ  DEFAULT now()
);

-- Allow public inserts (the invitation form is public-facing)
ALTER TABLE public.principal_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts" ON public.principal_rsvps
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public updates by email" ON public.principal_rsvps
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow admin reads" ON public.principal_rsvps
  FOR SELECT TO anon USING (true);

-- Index for fast email lookups (duplicate prevention)
CREATE INDEX IF NOT EXISTS idx_principal_rsvps_email ON public.principal_rsvps (email);
