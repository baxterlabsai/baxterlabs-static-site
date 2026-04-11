-- Migration 070: Add approval review workflow columns to engagement_graphics
-- The new `approval_status` column is a SEPARATE workflow from the existing
-- `status` column. `status` tracks the generation pipeline (pending,
-- generated, verified, failed). `approval_status` tracks the human review
-- workflow (pending, approved, fix_requested) that drives the Graphics
-- Review surface on the Engagement Detail page (P8).

ALTER TABLE engagement_graphics
  ADD COLUMN IF NOT EXISTS approval_status   TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fix_instructions  TEXT,
  ADD COLUMN IF NOT EXISTS fix_requested_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;

ALTER TABLE engagement_graphics
  DROP CONSTRAINT IF EXISTS engagement_graphics_approval_status_check;

ALTER TABLE engagement_graphics
  ADD CONSTRAINT engagement_graphics_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'fix_requested'));

CREATE INDEX IF NOT EXISTS idx_engagement_graphics_approval_status
  ON engagement_graphics(approval_status);

COMMENT ON COLUMN engagement_graphics.approval_status IS
  'Human review workflow: pending (default) -> approved | fix_requested. Distinct from the `status` column which tracks the generation pipeline.';
COMMENT ON COLUMN engagement_graphics.fix_instructions IS
  'Populated when approval_status = fix_requested. Consumed by the Cowork fix-graphic skill.';
COMMENT ON COLUMN engagement_graphics.fix_requested_at IS
  'Timestamp set when a fix is requested; cleared on approve or reset.';
COMMENT ON COLUMN engagement_graphics.approved_at IS
  'Timestamp set when a graphic is approved; cleared on reset or fix request.';
