-- Migration 027: Lead tier on contacts, lead score on companies, stage transition logging
-- Supports Enhancement 3 (Contact Tier & Lead Score) and Enhancement 7 (Analytics prep)

-- 1. lead_tier on CONTACTS (relationship proximity to the person)
ALTER TABLE pipeline_contacts
  ADD COLUMN IF NOT EXISTS lead_tier TEXT
    CHECK (lead_tier IN ('tier_1', 'tier_2', 'tier_3'));

-- 2. lead_score on COMPANIES (firm-fit scoring, Day 76-90)
ALTER TABLE pipeline_companies
  ADD COLUMN IF NOT EXISTS lead_score INTEGER;

-- 3. Stage transition log for conversion analytics
CREATE TABLE IF NOT EXISTS pipeline_stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES pipeline_opportunities(id),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transitioned_by UUID
);

CREATE INDEX IF NOT EXISTS idx_stage_transitions_opp
  ON pipeline_stage_transitions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_date
  ON pipeline_stage_transitions(transitioned_at);
