-- Migration 034: Remove NDA flow
-- Drops NDA columns from pipeline_opportunities, updates stage constraint,
-- and removes nda_pending/nda_signed from the engagement_status enum.

--------------------------------------------------------------------------------
-- 1. Drop NDA columns from pipeline_opportunities
--------------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_pipeline_opp_nda_confirmation_token;

ALTER TABLE pipeline_opportunities
  DROP COLUMN IF EXISTS nda_envelope_id,
  DROP COLUMN IF EXISTS nda_requested_at;

-- Keep nda_confirmation_token — it's used as the schedule page token.
-- Rename it to schedule_token for clarity.
ALTER TABLE pipeline_opportunities
  RENAME COLUMN nda_confirmation_token TO schedule_token;

CREATE INDEX IF NOT EXISTS idx_pipeline_opp_schedule_token
  ON pipeline_opportunities (schedule_token);

--------------------------------------------------------------------------------
-- 2. Migrate any existing nda_sent/nda_signed opportunities BEFORE constraint
--------------------------------------------------------------------------------
UPDATE pipeline_opportunities
  SET stage = 'discovery_complete'
  WHERE stage IN ('nda_sent', 'nda_signed');

--------------------------------------------------------------------------------
-- 3. Update pipeline stage constraint (remove nda_sent, nda_signed)
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  DROP CONSTRAINT IF EXISTS pipeline_opportunities_stage_check;

ALTER TABLE pipeline_opportunities
  ADD CONSTRAINT pipeline_opportunities_stage_check
  CHECK (stage IN (
    -- Prospect stages (9)
    'identified', 'contacted', 'discovery_scheduled',
    'discovery_complete', 'negotiation', 'agreement_sent',
    'won', 'lost', 'dormant',
    -- Partner stages (6)
    'partner_identified', 'partner_researched', 'partner_outreach',
    'relationship_building', 'active_referrer', 'partner_dormant'
  ));

--------------------------------------------------------------------------------
-- 4. Remove nda_pending/nda_signed from engagement_status enum
--    PostgreSQL doesn't support DROP VALUE from enum, so we recreate it.
--------------------------------------------------------------------------------

-- Migrate any existing nda_pending/nda_signed engagements BEFORE enum swap
UPDATE engagements SET status = 'intake' WHERE status = 'nda_pending';
UPDATE engagements SET status = 'discovery_done' WHERE status = 'nda_signed';

-- Create new enum without nda_pending/nda_signed
CREATE TYPE engagement_status_new AS ENUM (
  'intake', 'discovery_done',
  'agreement_pending', 'agreement_signed', 'documents_pending',
  'documents_received', 'phase_0', 'phase_1', 'phase_2', 'phase_3',
  'phase_4', 'phase_5', 'phase_6', 'phase_7', 'phases_complete',
  'debrief', 'wave_1_released', 'wave_2_released', 'closed'
);

-- Drop default, swap type, re-add default
ALTER TABLE engagements ALTER COLUMN status DROP DEFAULT;

ALTER TABLE engagements
  ALTER COLUMN status TYPE engagement_status_new
  USING status::text::engagement_status_new;

ALTER TABLE engagements ALTER COLUMN status SET DEFAULT 'intake'::engagement_status_new;

DROP TYPE engagement_status;
ALTER TYPE engagement_status_new RENAME TO engagement_status;
