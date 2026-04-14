-- Migration 070: Add created_by attribution columns to all shared and personal tables
-- Phase B of the multi-user migration plan
--
-- Tables that ALREADY have created_by (7): pipeline_companies, pipeline_contacts,
-- pipeline_opportunities, pipeline_activities, pipeline_tasks, research_intelligence,
-- call_prep_sessions — these are skipped.
--
-- FK constraints are NOT added here — they come in Phase C (migration 072)
-- after the backfill populates all nulls with valid auth.users IDs.

-- ============================================================================
-- B1: Add created_by to shared tables (16 tables)
-- ============================================================================

ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE research_documents
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE phase_outputs
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE phase_output_content
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE phase_executions
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE engagement_graphics
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE pipeline_briefings
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE pipeline_stage_transitions
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE follow_up_sequences
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE interview_contacts
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE legal_documents
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- ============================================================================
-- B1: Add created_by to personal tables (5 tables)
-- ============================================================================

ALTER TABLE story_bank
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE content_news
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE commenting_opportunities
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- ============================================================================
-- B2: Add assigned_to_user_id alongside existing assigned_to text columns
-- ============================================================================

ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid;

ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid;
