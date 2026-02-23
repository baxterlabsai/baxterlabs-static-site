CREATE TABLE research_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('company_dossier', 'interview_brief')),
  content TEXT,
  source_urls JSONB DEFAULT '[]'::jsonb,
  contact_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
