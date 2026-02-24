-- 015_deliverables_filename.sql
-- Add filename column to deliverables table for tracking original upload filenames.

ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS filename TEXT;
