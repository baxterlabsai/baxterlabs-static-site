-- 1. Drop the narrow type check constraint
ALTER TABLE research_documents
  DROP CONSTRAINT IF EXISTS research_documents_type_check;

-- 2. Replace with expanded constraint
ALTER TABLE research_documents
  ADD CONSTRAINT research_documents_type_check
  CHECK (type IN ('company_dossier', 'interview_brief', 'contact_research', 'interview_transcript'));

-- 3. Add missing columns for contact-research and process-transcript skills
ALTER TABLE research_documents
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

-- 4. Add contact_id FK for efficient transcript queries by contact
ALTER TABLE research_documents
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES interview_contacts(id);
