-- Allow NULL storage_path on documents table for Google Doc imports
-- (no physical file in storage — content comes from GDoc URL)
ALTER TABLE documents ALTER COLUMN storage_path DROP NOT NULL;
