-- Migration 026: Interview contacts enrichment + opportunity call notes
-- Adds role, enrichment_data, call_notes_doc_url, timestamps to interview_contacts
-- Adds call_notes_doc_url to pipeline_opportunities

-- 1a. Extend interview_contacts with role, enrichment, call notes, timestamps
ALTER TABLE interview_contacts
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'interviewee'
    CHECK (role IN ('primary', 'interviewee', 'document_uploader')),
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB,
  ADD COLUMN IF NOT EXISTS call_notes_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 1b. Relax contact_number — make nullable, drop max=3 check
ALTER TABLE interview_contacts ALTER COLUMN contact_number DROP NOT NULL;
ALTER TABLE interview_contacts DROP CONSTRAINT IF EXISTS interview_contacts_contact_number_check;
ALTER TABLE interview_contacts
  ADD CONSTRAINT interview_contacts_contact_number_check
    CHECK (contact_number IS NULL OR contact_number >= 1);

-- 1c. Add call_notes_doc_url to pipeline_opportunities
ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS call_notes_doc_url TEXT;
