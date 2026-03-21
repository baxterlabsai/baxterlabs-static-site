ALTER TABLE interview_contacts
ADD COLUMN IF NOT EXISTS transcript_gdrive_url TEXT;

ALTER TABLE interview_contacts
ADD COLUMN IF NOT EXISTS prep_source_phase_output_id UUID
REFERENCES phase_output_content(id);
