-- Migration 032: Create pipeline_partners table
-- Canonical partner identity for outreach signatures, email sender system,
-- and any consumer that needs partner name/email/phone/title.
-- Replaces hardcoded PARTNER_EMAILS dict in backend/services/email_service.py

CREATE TABLE IF NOT EXISTS pipeline_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT,
  calendly_url TEXT,
  linkedin_url TEXT,
  signature_block TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_partners_name
  ON pipeline_partners(name);

CREATE INDEX IF NOT EXISTS idx_pipeline_partners_active
  ON pipeline_partners(is_active) WHERE is_active = true;

-- Seed known partners
INSERT INTO pipeline_partners (name, email, phone, title, is_active)
VALUES
  ('George DeVries', 'george@baxterlabs.ai', NULL, 'Managing Partner', true),
  ('Alfonso Cordon', 'alfonso@baxterlabs.ai', NULL, 'Partner', false);
