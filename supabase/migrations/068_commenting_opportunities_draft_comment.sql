-- Migration: Add draft comment columns to commenting_opportunities
-- Purpose: Support P6 auto-draft comment workflow. The LinkedIn Commenting
-- Pre-Brief scheduled task will populate draft_comment for fresh opportunities,
-- and the Commenting.tsx frontend will render the draft inline with Copy/Redraft.

ALTER TABLE commenting_opportunities
  ADD COLUMN draft_comment TEXT,
  ADD COLUMN draft_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN commenting_opportunities.draft_comment IS
  'Auto-generated LinkedIn comment draft. Populated by baxterlabs-content draft-comment skill via the LinkedIn Commenting Pre-Brief scheduled task. Nullable; NULL means no draft yet.';

COMMENT ON COLUMN commenting_opportunities.draft_generated_at IS
  'Timestamp of when draft_comment was last generated. Used by Commenting.tsx to render relative time on the DRAFT badge.';
