-- Add Google Drive subfolder ID columns to engagements
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drive_inbox_folder_id TEXT;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drive_interviews_folder_id TEXT;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drive_working_papers_folder_id TEXT;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drive_deliverables_folder_id TEXT;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drive_qc_folder_id TEXT;
