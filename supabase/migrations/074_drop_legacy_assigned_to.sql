-- Drop legacy assigned_to text columns from pipeline_tasks and pipeline_opportunities.
-- Multi-user refactor cleanup: all reads/writes now go through assigned_to_user_id (uuid).
-- Phase F (frontend) and the post-Phase-F backend cleanup completed before this migration.

ALTER TABLE pipeline_tasks DROP COLUMN assigned_to;
ALTER TABLE pipeline_opportunities DROP COLUMN assigned_to;
