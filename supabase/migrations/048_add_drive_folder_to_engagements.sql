-- Add Google Drive folder tracking columns to engagements
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;
