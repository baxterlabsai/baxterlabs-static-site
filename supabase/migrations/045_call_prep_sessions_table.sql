-- Migration 045: call_prep_sessions table
-- Extracts call-prep workflow into a dedicated table instead of
-- burying it inside pipeline_companies.enrichment_data JSONB.

CREATE TABLE call_prep_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES pipeline_companies(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES pipeline_contacts(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES pipeline_opportunities(id) ON DELETE SET NULL,
  title           TEXT,
  content         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'ready', 'used', 'archived')),
  session_date    DATE,
  notes           TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_call_prep_sessions_company_id ON call_prep_sessions (company_id);
CREATE INDEX idx_call_prep_sessions_opportunity_id ON call_prep_sessions (opportunity_id);

CREATE TRIGGER call_prep_sessions_updated_at
  BEFORE UPDATE ON call_prep_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE call_prep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON call_prep_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
