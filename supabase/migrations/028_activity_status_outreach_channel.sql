-- Migration 028: Add status and outreach_channel to pipeline_activities
-- Supports Draft Queue (Enhancement 1) and Channel Attribution (Enhancement 5)

-- Activity status: draft → sent/discarded, or 'logged' (default for non-draft activities)
ALTER TABLE pipeline_activities
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'logged'
    CHECK (status IN ('draft', 'sent', 'discarded', 'logged'));

-- Outreach channel for analytics attribution
ALTER TABLE pipeline_activities
  ADD COLUMN IF NOT EXISTS outreach_channel TEXT
    CHECK (outreach_channel IN ('email', 'linkedin', 'phone', 'other'));

-- Index for the Draft Queue query (status = 'draft', recent first)
CREATE INDEX IF NOT EXISTS idx_activities_status ON pipeline_activities(status)
  WHERE status = 'draft' AND is_deleted = false;
