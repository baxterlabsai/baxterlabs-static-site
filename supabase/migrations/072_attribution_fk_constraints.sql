-- Migration 072: Add FK constraints on created_by and assigned_to_user_id
-- Phase C2 of the multi-user migration plan
--
-- All created_by and assigned_to_user_id columns have been backfilled
-- (migration 071) — no NULLs remain, so FK constraints will succeed.
-- ON DELETE SET NULL preserves rows if a user is ever removed.

-- ============================================================================
-- FK constraints on created_by → auth.users(id) for all 28 tables
-- ============================================================================

-- Shared tables (16 newly added in Phase B)
ALTER TABLE activity_log
  ADD CONSTRAINT activity_log_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE engagements
  ADD CONSTRAINT engagements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE clients
  ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE documents
  ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE research_documents
  ADD CONSTRAINT research_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE deliverables
  ADD CONSTRAINT deliverables_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE phase_outputs
  ADD CONSTRAINT phase_outputs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE phase_output_content
  ADD CONSTRAINT phase_output_content_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE phase_executions
  ADD CONSTRAINT phase_executions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE engagement_graphics
  ADD CONSTRAINT engagement_graphics_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pipeline_briefings
  ADD CONSTRAINT pipeline_briefings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pipeline_stage_transitions
  ADD CONSTRAINT pipeline_stage_transitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE follow_up_sequences
  ADD CONSTRAINT follow_up_sequences_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE interview_contacts
  ADD CONSTRAINT interview_contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE legal_documents
  ADD CONSTRAINT legal_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Personal tables (5 newly added in Phase B)
ALTER TABLE story_bank
  ADD CONSTRAINT story_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE content_posts
  ADD CONSTRAINT content_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE content_news
  ADD CONSTRAINT content_news_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE commenting_opportunities
  ADD CONSTRAINT commenting_opportunities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE content_ideas
  ADD CONSTRAINT content_ideas_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7 tables that already had bare created_by uuid columns (no FK until now)
-- Note: pipeline_companies already had this FK from migration 067; DO NOTHING handles the duplicate.
DO $$ BEGIN
  ALTER TABLE pipeline_companies ADD CONSTRAINT pipeline_companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE pipeline_contacts
  ADD CONSTRAINT pipeline_contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pipeline_opportunities
  ADD CONSTRAINT pipeline_opportunities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pipeline_activities
  ADD CONSTRAINT pipeline_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pipeline_tasks
  ADD CONSTRAINT pipeline_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE research_intelligence
  ADD CONSTRAINT research_intelligence_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE call_prep_sessions
  ADD CONSTRAINT call_prep_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- FK constraints on assigned_to_user_id → auth.users(id)
-- ============================================================================

ALTER TABLE pipeline_opportunities
  ADD CONSTRAINT pipeline_opportunities_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pipeline_tasks
  ADD CONSTRAINT pipeline_tasks_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
