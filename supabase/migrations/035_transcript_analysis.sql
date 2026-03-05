-- Add extracted_text and analysis_json columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis_json JSONB;
