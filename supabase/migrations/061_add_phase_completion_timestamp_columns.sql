-- Add timestamp columns for phase completion tracking.
-- Replaces activity_log scanning for completion state signals.
-- deliverables_sent_at and archived_at already exist on engagements.
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS phase_7_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deck_built_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pdfs_converted_at TIMESTAMPTZ;
