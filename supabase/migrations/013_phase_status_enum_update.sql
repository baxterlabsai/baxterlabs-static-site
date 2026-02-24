-- 013_phase_status_enum_update.sql
-- Add missing phase values to the engagement_status enum:
--   phase_0        (after documents_received, before phase_1)
--   phase_7        (after phase_6, before debrief)
--   phases_complete (after phase_7, before debrief)
--
-- Uses IF NOT EXISTS for idempotency.
-- ADD VALUE ... BEFORE/AFTER controls ordering within the enum.

ALTER TYPE engagement_status ADD VALUE IF NOT EXISTS 'phase_0' BEFORE 'phase_1';
ALTER TYPE engagement_status ADD VALUE IF NOT EXISTS 'phase_7' AFTER 'phase_6';
ALTER TYPE engagement_status ADD VALUE IF NOT EXISTS 'phases_complete' AFTER 'phase_7';
