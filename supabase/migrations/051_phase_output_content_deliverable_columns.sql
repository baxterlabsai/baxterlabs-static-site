-- Add deliverable-pipeline columns to phase_output_content
-- Track 1 (Word/PDF): docx_pdf_preview_path, docx_path
-- Track 2 (Deck):     pdf_preview_path, pdf_approved, pptx_path
-- Track 3 (Excel):    xlsx_path, xlsx_link

ALTER TABLE phase_output_content
  ADD COLUMN IF NOT EXISTS docx_pdf_preview_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_preview_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pptx_path TEXT,
  ADD COLUMN IF NOT EXISTS docx_path TEXT,
  ADD COLUMN IF NOT EXISTS xlsx_path TEXT,
  ADD COLUMN IF NOT EXISTS xlsx_link TEXT;

-- Update status check to support the full review lifecycle
ALTER TABLE phase_output_content DROP CONSTRAINT IF EXISTS phase_output_content_status_check;
ALTER TABLE phase_output_content
  ADD CONSTRAINT phase_output_content_status_check
  CHECK (status IN ('draft', 'in_review', 'approved', 'delivered'));
