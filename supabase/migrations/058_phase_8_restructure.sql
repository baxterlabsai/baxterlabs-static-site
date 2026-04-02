-- Extend engagement pipeline from 8 phases (0-7) to 9 phases (0-8).
-- Phase 5: Deliverable Content Assembly, Phase 7: Document Packaging, Phase 8: Archive & Close.

-- 1. Add phase_8 to engagement_status enum
ALTER TYPE engagement_status ADD VALUE IF NOT EXISTS 'phase_8' AFTER 'phase_7';

-- 2. Extend CHECK constraints from <= 7 to <= 8
ALTER TABLE engagements DROP CONSTRAINT engagements_phase_check;
ALTER TABLE engagements ADD CONSTRAINT engagements_phase_check CHECK (phase >= 0 AND phase <= 8);

ALTER TABLE phase_output_content DROP CONSTRAINT phase_output_content_phase_number_check;
ALTER TABLE phase_output_content ADD CONSTRAINT phase_output_content_phase_number_check CHECK (phase_number >= 0 AND phase_number <= 8);

ALTER TABLE phase_prompts DROP CONSTRAINT phase_prompts_phase_check;
ALTER TABLE phase_prompts ADD CONSTRAINT phase_prompts_phase_check CHECK (phase >= 0 AND phase <= 8);
