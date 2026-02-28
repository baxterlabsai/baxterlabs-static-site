-- Migration: add document upload contact fields to engagements

ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS document_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS document_contact_title TEXT,
  ADD COLUMN IF NOT EXISTS document_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS document_contact_phone TEXT;
