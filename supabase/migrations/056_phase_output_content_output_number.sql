-- Add output_number column to phase_output_content
-- Default 1 so all existing single-output rows get a value automatically
ALTER TABLE phase_output_content
ADD COLUMN IF NOT EXISTS output_number INTEGER NOT NULL DEFAULT 1;

-- Add unique constraint: one row per engagement + phase + output number
-- This prevents duplicate writes for the same output
ALTER TABLE phase_output_content
ADD CONSTRAINT uq_phase_output_engagement_phase_number
UNIQUE (engagement_id, phase_number, output_number);
