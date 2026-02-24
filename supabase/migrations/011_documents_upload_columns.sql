-- Add upload-portal columns to documents table
ALTER TABLE documents ADD COLUMN document_type TEXT NOT NULL DEFAULT 'client_upload';
ALTER TABLE documents ADD COLUMN item_name TEXT;
ALTER TABLE documents ADD COLUMN uploaded_by TEXT NOT NULL DEFAULT 'client';

-- Enforce one file per checklist item per engagement
CREATE UNIQUE INDEX idx_documents_engagement_item_unique
  ON documents(engagement_id, item_name) WHERE item_name IS NOT NULL;
