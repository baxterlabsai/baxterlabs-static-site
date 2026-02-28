-- Migration 022: Add CHECK constraint on phase_outputs.status
-- Unifies valid values from both the dashboard and the Cowork advisory plugin.
--
-- Dashboard values: pending, uploaded, accepted
-- Plugin values:    pending, in_progress, complete, review_required

ALTER TABLE phase_outputs
  ADD CONSTRAINT phase_outputs_status_check
  CHECK (status IN ('pending', 'uploaded', 'accepted', 'in_progress', 'complete', 'review_required'));
