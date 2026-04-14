-- Migration 071: Backfill created_by and assigned_to_user_id attribution
-- Phase C1 of the multi-user migration plan
--
-- All existing data was created by George (sole user prior to multi-user).
-- Backfills 544 rows with NULL created_by to George's auth UUID.
-- Backfills 146 rows with NULL assigned_to_user_id based on assigned_to text.

-- George's auth.users UUID
-- 9a3603f4-88a9-449d-bba0-809043616d95

-- ============================================================================
-- C1: Backfill created_by to George's auth UUID where NULL
-- ============================================================================

UPDATE activity_log SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE call_prep_sessions SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE clients SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE commenting_opportunities SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE content_news SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE content_posts SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE documents SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE engagement_graphics SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE engagements SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE interview_contacts SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE invoices SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE legal_documents SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE phase_executions SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE phase_output_content SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE phase_outputs SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE pipeline_activities SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE pipeline_briefings SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE pipeline_contacts SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE pipeline_stage_transitions SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE pipeline_tasks SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE research_documents SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE research_intelligence SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE story_bank SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;

-- Tables with 0 NULL rows (no-op but included for completeness):
UPDATE content_ideas SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE deliverables SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE follow_up_sequences SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE pipeline_companies SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;
UPDATE pipeline_opportunities SET created_by = '9a3603f4-88a9-449d-bba0-809043616d95' WHERE created_by IS NULL;

-- ============================================================================
-- C2: Backfill assigned_to_user_id from assigned_to text values
-- ============================================================================

-- All existing assigned_to values are "George DeVries" or "George"
-- Both map to George's auth UUID. NULL/empty rows also default to George.
UPDATE pipeline_opportunities
SET assigned_to_user_id = '9a3603f4-88a9-449d-bba0-809043616d95'
WHERE assigned_to_user_id IS NULL;

UPDATE pipeline_tasks
SET assigned_to_user_id = '9a3603f4-88a9-449d-bba0-809043616d95'
WHERE assigned_to_user_id IS NULL;
