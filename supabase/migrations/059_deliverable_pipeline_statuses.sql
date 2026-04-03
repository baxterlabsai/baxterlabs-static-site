-- Add new engagement status enum values for the deliverable pipeline.
-- Keep all existing values; just add the three new ones after phase_7.
ALTER TYPE engagement_status ADD VALUE IF NOT EXISTS 'deck_complete' AFTER 'phase_7';
ALTER TYPE engagement_status ADD VALUE IF NOT EXISTS 'pdfs_complete' AFTER 'deck_complete';
ALTER TYPE engagement_status ADD VALUE IF NOT EXISTS 'deliverables_sent' AFTER 'pdfs_complete';

-- Add PDF delivery tracking columns to phase_output_content
ALTER TABLE phase_output_content ADD COLUMN IF NOT EXISTS final_pdf_path TEXT;
ALTER TABLE phase_output_content ADD COLUMN IF NOT EXISTS final_pdf_approved BOOLEAN DEFAULT false NOT NULL;

-- Add delivery tracking columns to engagements
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS deliverables_sent_at TIMESTAMPTZ;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS deliverables_sent_to TEXT;
