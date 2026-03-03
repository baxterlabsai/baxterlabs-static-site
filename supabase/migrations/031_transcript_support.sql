-- Migration 031: Transcript upload support
-- Adds transcript category to documents and transcript_document_id FK to interview_contacts

--------------------------------------------------------------------------------
-- 1. Expand documents.category CHECK to include 'transcript'
--------------------------------------------------------------------------------
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN ('financial', 'payroll', 'vendor', 'revenue', 'operations', 'legal', 'transcript'));

--------------------------------------------------------------------------------
-- 2. Add transcript_document_id FK on interview_contacts
--------------------------------------------------------------------------------
ALTER TABLE interview_contacts
  ADD COLUMN IF NOT EXISTS transcript_document_id UUID
    REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interview_contacts_transcript_doc
  ON interview_contacts(transcript_document_id)
  WHERE transcript_document_id IS NOT NULL;
