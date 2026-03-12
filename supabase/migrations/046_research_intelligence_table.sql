-- Migration 046: research_intelligence table
-- Structured store for company research, enrichment, and competitive intel
-- instead of free-form JSONB inside enrichment_data.

CREATE TABLE research_intelligence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES pipeline_companies(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
                  CHECK (category IN (
                    'research', 'enrichment', 'competitive_intel',
                    'news', 'financial', 'technology', 'custom'
                  )),
  title           TEXT,
  content         TEXT,
  source          TEXT,
  source_url      TEXT,
  confidence      TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_research_intelligence_company_id ON research_intelligence (company_id);

CREATE TRIGGER research_intelligence_updated_at
  BEFORE UPDATE ON research_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE research_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON research_intelligence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
