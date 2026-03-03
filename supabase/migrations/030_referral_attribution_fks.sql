-- Migration 030: Referral attribution — FK columns on pipeline_opportunities
-- Links referrals to specific pipeline companies and contacts

ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS referred_by_company_id UUID
    REFERENCES pipeline_companies(id) ON DELETE SET NULL;

ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS referred_by_contact_id UUID
    REFERENCES pipeline_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opps_referred_company
  ON pipeline_opportunities(referred_by_company_id)
  WHERE referred_by_company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opps_referred_contact
  ON pipeline_opportunities(referred_by_contact_id)
  WHERE referred_by_contact_id IS NOT NULL;
