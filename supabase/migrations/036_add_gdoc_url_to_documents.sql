-- Add gdoc_url to documents table for Google Docs transcript source tracking
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS gdoc_url TEXT;

COMMENT ON COLUMN documents.gdoc_url IS 'Google Docs URL when transcript was imported via GDoc URL instead of file upload. Used for citation source tracing.';
