-- Migration: add onboarding token + context notes for interview contact onboarding flow

-- 1. Add onboarding columns to engagements
ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS onboarding_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. Add context_notes to interview_contacts
ALTER TABLE interview_contacts
  ADD COLUMN IF NOT EXISTS context_notes TEXT;

-- 3. Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_engagements_onboarding_token
  ON engagements (onboarding_token)
  WHERE onboarding_token IS NOT NULL;
