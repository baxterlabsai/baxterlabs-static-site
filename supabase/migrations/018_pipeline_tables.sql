-- Migration 018: Pipeline Management Tables
-- Adds 5 new tables for CRM/pipeline functionality.
-- Does NOT modify any existing tables.

--------------------------------------------------------------------------------
-- 1. pipeline_companies
--------------------------------------------------------------------------------
CREATE TABLE pipeline_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  website         TEXT,
  industry        TEXT,
  revenue_range   TEXT,
  employee_count  TEXT,
  location        TEXT,
  notes           TEXT,
  source          TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_pipeline_companies_name ON pipeline_companies (name);

CREATE TRIGGER pipeline_companies_updated_at
  BEFORE UPDATE ON pipeline_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

--------------------------------------------------------------------------------
-- 2. pipeline_contacts
--------------------------------------------------------------------------------
CREATE TABLE pipeline_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES pipeline_companies(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  title             TEXT,
  email             TEXT,
  phone             TEXT,
  linkedin_url      TEXT,
  is_decision_maker BOOLEAN NOT NULL DEFAULT false,
  notes             TEXT,
  source            TEXT,
  is_deleted        BOOLEAN NOT NULL DEFAULT false,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_pipeline_contacts_company_id ON pipeline_contacts (company_id);
CREATE INDEX idx_pipeline_contacts_name ON pipeline_contacts (name);

CREATE TRIGGER pipeline_contacts_updated_at
  BEFORE UPDATE ON pipeline_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

--------------------------------------------------------------------------------
-- 3. pipeline_opportunities
--------------------------------------------------------------------------------
CREATE TABLE pipeline_opportunities (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID NOT NULL REFERENCES pipeline_companies(id) ON DELETE CASCADE,
  primary_contact_id       UUID REFERENCES pipeline_contacts(id) ON DELETE SET NULL,
  title                    TEXT NOT NULL,
  stage                    TEXT NOT NULL DEFAULT 'identified'
                           CHECK (stage IN (
                             'identified', 'contacted', 'discovery_scheduled',
                             'discovery_complete', 'proposal_sent', 'negotiation',
                             'won', 'lost', 'dormant'
                           )),
  estimated_value          NUMERIC,
  estimated_close_date     DATE,
  loss_reason              TEXT,
  notes                    TEXT,
  assigned_to              TEXT,
  converted_client_id      UUID REFERENCES clients(id),
  converted_engagement_id  UUID REFERENCES engagements(id),
  is_deleted               BOOLEAN NOT NULL DEFAULT false,
  deleted_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by               UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_pipeline_opportunities_company_id          ON pipeline_opportunities (company_id);
CREATE INDEX idx_pipeline_opportunities_stage               ON pipeline_opportunities (stage);
CREATE INDEX idx_pipeline_opportunities_assigned_to         ON pipeline_opportunities (assigned_to);
CREATE INDEX idx_pipeline_opportunities_estimated_close_date ON pipeline_opportunities (estimated_close_date);

CREATE TRIGGER pipeline_opportunities_updated_at
  BEFORE UPDATE ON pipeline_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

--------------------------------------------------------------------------------
-- 4. pipeline_activities
--------------------------------------------------------------------------------
CREATE TABLE pipeline_activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        UUID REFERENCES pipeline_contacts(id) ON DELETE SET NULL,
  opportunity_id    UUID REFERENCES pipeline_opportunities(id) ON DELETE SET NULL,
  company_id        UUID REFERENCES pipeline_companies(id) ON DELETE SET NULL,
  type              TEXT NOT NULL
                    CHECK (type IN (
                      'video_call', 'phone_call', 'email', 'dm',
                      'linkedin', 'meeting', 'note', 'referral'
                    )),
  subject           TEXT NOT NULL,
  body              TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes  INTEGER,
  outcome           TEXT,
  next_action       TEXT,
  next_action_date  DATE,
  gemini_raw_notes  TEXT,
  is_deleted        BOOLEAN NOT NULL DEFAULT false,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_pipeline_activities_contact_id       ON pipeline_activities (contact_id);
CREATE INDEX idx_pipeline_activities_opportunity_id    ON pipeline_activities (opportunity_id);
CREATE INDEX idx_pipeline_activities_company_id        ON pipeline_activities (company_id);
CREATE INDEX idx_pipeline_activities_occurred_at       ON pipeline_activities (occurred_at);
CREATE INDEX idx_pipeline_activities_next_action_date  ON pipeline_activities (next_action_date);

--------------------------------------------------------------------------------
-- 5. pipeline_tasks
--------------------------------------------------------------------------------
CREATE TABLE pipeline_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID REFERENCES pipeline_contacts(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES pipeline_opportunities(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  due_date        DATE,
  priority        TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('high', 'normal', 'low')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'complete', 'skipped')),
  completed_at    TIMESTAMPTZ,
  assigned_to     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_pipeline_tasks_due_date    ON pipeline_tasks (due_date);
CREATE INDEX idx_pipeline_tasks_status      ON pipeline_tasks (status);
CREATE INDEX idx_pipeline_tasks_assigned_to ON pipeline_tasks (assigned_to);

--------------------------------------------------------------------------------
-- 6. Row-Level Security — full CRUD for authenticated role
--------------------------------------------------------------------------------
ALTER TABLE pipeline_companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_activities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_tasks        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON pipeline_companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON pipeline_contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON pipeline_opportunities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON pipeline_activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON pipeline_tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
