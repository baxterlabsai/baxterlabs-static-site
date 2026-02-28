-- Migration 019: Pipeline Lifecycle Refactor
-- Adds new pipeline stages (nda_sent, nda_signed, agreement_sent),
-- removes proposal_sent, adds Calendly + DocuSign tracking columns.

--------------------------------------------------------------------------------
-- 1. Drop old stage constraint, add new one with 11 stages
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  DROP CONSTRAINT IF EXISTS pipeline_opportunities_stage_check;

ALTER TABLE pipeline_opportunities
  ADD CONSTRAINT pipeline_opportunities_stage_check
  CHECK (stage IN (
    'identified', 'contacted', 'discovery_scheduled', 'nda_sent',
    'nda_signed', 'discovery_complete', 'negotiation', 'agreement_sent',
    'won', 'lost', 'dormant'
  ));

--------------------------------------------------------------------------------
-- 2. Migrate existing proposal_sent → negotiation
--------------------------------------------------------------------------------
UPDATE pipeline_opportunities
  SET stage = 'negotiation'
  WHERE stage = 'proposal_sent';

--------------------------------------------------------------------------------
-- 3. Add Calendly tracking columns
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS calendly_event_uri      TEXT,
  ADD COLUMN IF NOT EXISTS calendly_invitee_uri    TEXT,
  ADD COLUMN IF NOT EXISTS calendly_booking_time   TIMESTAMPTZ;

--------------------------------------------------------------------------------
-- 4. Add NDA tracking columns (pipeline-level, no FK to engagements)
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS nda_envelope_id          TEXT,
  ADD COLUMN IF NOT EXISTS nda_confirmation_token   UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS nda_requested_at         TIMESTAMPTZ;

--------------------------------------------------------------------------------
-- 5. Add Agreement tracking column
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS agreement_envelope_id    TEXT;

--------------------------------------------------------------------------------
-- 6. Index on nda_confirmation_token for public lookups
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pipeline_opp_nda_confirmation_token
  ON pipeline_opportunities (nda_confirmation_token);
