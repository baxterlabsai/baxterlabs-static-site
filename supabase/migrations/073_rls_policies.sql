-- ============================================================================
-- 073_rls_policies.sql
-- Phase E: Replace wide-open RLS policies with proper per-table policies.
--
-- Categories:
--   Shared CRUD (14 tables)  — SELECT/INSERT/UPDATE/DELETE gated on is_partner()
--   Shared read-only (9 tables) — SELECT only, gated on is_partner()
--   Personal (5 tables) — owner-scoped via created_by = auth.uid()
--
-- Rollback: 073_rls_policies_rollback.sql (must be saved BEFORE applying this)
-- ============================================================================

BEGIN;

-- -------------------------------------------------------
-- 1. Helper function: is_partner()
--    Returns true if the current auth user is an active partner.
--    SECURITY DEFINER so it can read pipeline_partners regardless of RLS.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pipeline_partners
    WHERE auth_user_id = auth.uid()
      AND is_active = true
  );
$$;

-- Grant execute to authenticated role (not public/anon)
REVOKE ALL ON FUNCTION public.is_partner() FROM public;
GRANT EXECUTE ON FUNCTION public.is_partner() TO authenticated;

-- -------------------------------------------------------
-- 2. Drop ALL existing policies on the 28 target tables
-- -------------------------------------------------------

-- activity_log
DROP POLICY IF EXISTS "Partners read activity" ON public.activity_log;

-- call_prep_sessions
DROP POLICY IF EXISTS "authenticated_full_access" ON public.call_prep_sessions;

-- clients
DROP POLICY IF EXISTS "Partners read clients" ON public.clients;

-- commenting_opportunities
DROP POLICY IF EXISTS "authenticated_full_access" ON public.commenting_opportunities;

-- content_ideas
DROP POLICY IF EXISTS "Allow all for service role" ON public.content_ideas;

-- content_news
DROP POLICY IF EXISTS "authenticated_full_access" ON public.content_news;

-- content_posts
DROP POLICY IF EXISTS "Allow all for service role" ON public.content_posts;

-- deliverables
DROP POLICY IF EXISTS "Partners read deliverables" ON public.deliverables;

-- documents
DROP POLICY IF EXISTS "Partners read documents" ON public.documents;

-- engagement_graphics
DROP POLICY IF EXISTS "Partners can manage engagement graphics" ON public.engagement_graphics;

-- engagements
DROP POLICY IF EXISTS "Partners read engagements" ON public.engagements;

-- follow_up_sequences
DROP POLICY IF EXISTS "Service role full access on follow_up_sequences" ON public.follow_up_sequences;

-- interview_contacts
DROP POLICY IF EXISTS "Partners read contacts" ON public.interview_contacts;

-- invoices
DROP POLICY IF EXISTS "Service role full access on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users read invoices" ON public.invoices;

-- legal_documents
DROP POLICY IF EXISTS "Partners read legal" ON public.legal_documents;

-- phase_executions
DROP POLICY IF EXISTS "Partners read executions" ON public.phase_executions;

-- phase_output_content
DROP POLICY IF EXISTS "Authenticated full access" ON public.phase_output_content;

-- phase_outputs
DROP POLICY IF EXISTS "Authenticated users can insert phase_outputs" ON public.phase_outputs;
DROP POLICY IF EXISTS "Authenticated users can read phase_outputs" ON public.phase_outputs;
DROP POLICY IF EXISTS "Authenticated users can update phase_outputs" ON public.phase_outputs;

-- pipeline_activities
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pipeline_activities;

-- pipeline_briefings
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pipeline_briefings;

-- pipeline_companies
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pipeline_companies;

-- pipeline_contacts
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pipeline_contacts;

-- pipeline_opportunities
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pipeline_opportunities;

-- pipeline_stage_transitions
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pipeline_stage_transitions;

-- pipeline_tasks
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pipeline_tasks;

-- research_documents
DROP POLICY IF EXISTS "Partners read research" ON public.research_documents;

-- research_intelligence
DROP POLICY IF EXISTS "authenticated_full_access" ON public.research_intelligence;

-- story_bank
DROP POLICY IF EXISTS "Allow all for service role" ON public.story_bank;

-- -------------------------------------------------------
-- 3. Shared CRUD tables (14) — 4 policies each
--    All gated on is_partner()
-- -------------------------------------------------------

-- --- pipeline_companies ---
CREATE POLICY "partner_select" ON public.pipeline_companies
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.pipeline_companies
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.pipeline_companies
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.pipeline_companies
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- pipeline_contacts ---
CREATE POLICY "partner_select" ON public.pipeline_contacts
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.pipeline_contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.pipeline_contacts
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.pipeline_contacts
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- pipeline_opportunities ---
CREATE POLICY "partner_select" ON public.pipeline_opportunities
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.pipeline_opportunities
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.pipeline_opportunities
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.pipeline_opportunities
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- pipeline_activities ---
CREATE POLICY "partner_select" ON public.pipeline_activities
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.pipeline_activities
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.pipeline_activities
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.pipeline_activities
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- pipeline_tasks ---
CREATE POLICY "partner_select" ON public.pipeline_tasks
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.pipeline_tasks
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.pipeline_tasks
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.pipeline_tasks
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- pipeline_briefings ---
CREATE POLICY "partner_select" ON public.pipeline_briefings
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.pipeline_briefings
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.pipeline_briefings
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.pipeline_briefings
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- pipeline_stage_transitions ---
CREATE POLICY "partner_select" ON public.pipeline_stage_transitions
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.pipeline_stage_transitions
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.pipeline_stage_transitions
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.pipeline_stage_transitions
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- call_prep_sessions ---
CREATE POLICY "partner_select" ON public.call_prep_sessions
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.call_prep_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.call_prep_sessions
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.call_prep_sessions
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- research_intelligence ---
CREATE POLICY "partner_select" ON public.research_intelligence
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.research_intelligence
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.research_intelligence
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.research_intelligence
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- phase_outputs ---
CREATE POLICY "partner_select" ON public.phase_outputs
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.phase_outputs
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.phase_outputs
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.phase_outputs
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- phase_output_content ---
CREATE POLICY "partner_select" ON public.phase_output_content
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.phase_output_content
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.phase_output_content
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.phase_output_content
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- engagement_graphics ---
CREATE POLICY "partner_select" ON public.engagement_graphics
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.engagement_graphics
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.engagement_graphics
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.engagement_graphics
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- follow_up_sequences ---
CREATE POLICY "partner_select" ON public.follow_up_sequences
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.follow_up_sequences
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.follow_up_sequences
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.follow_up_sequences
  FOR DELETE TO authenticated USING (public.is_partner());

-- --- invoices ---
CREATE POLICY "partner_select" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_partner());
CREATE POLICY "partner_insert" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (public.is_partner());
CREATE POLICY "partner_update" ON public.invoices
  FOR UPDATE TO authenticated USING (public.is_partner()) WITH CHECK (public.is_partner());
CREATE POLICY "partner_delete" ON public.invoices
  FOR DELETE TO authenticated USING (public.is_partner());

-- -------------------------------------------------------
-- 4. Shared read-only tables (9) — SELECT only
--    Gated on is_partner()
-- -------------------------------------------------------

CREATE POLICY "partner_select" ON public.activity_log
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.clients
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.deliverables
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.documents
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.engagements
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.interview_contacts
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.legal_documents
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.phase_executions
  FOR SELECT TO authenticated USING (public.is_partner());

CREATE POLICY "partner_select" ON public.research_documents
  FOR SELECT TO authenticated USING (public.is_partner());

-- -------------------------------------------------------
-- 5. Personal tables (5) — owner-scoped
--    SELECT/UPDATE/DELETE: created_by = auth.uid() AND is_partner()
--    INSERT: is_partner() with WITH CHECK created_by = auth.uid()
-- -------------------------------------------------------

-- --- story_bank ---
CREATE POLICY "owner_select" ON public.story_bank
  FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_insert" ON public.story_bank
  FOR INSERT TO authenticated WITH CHECK (public.is_partner() AND created_by = auth.uid());
CREATE POLICY "owner_update" ON public.story_bank
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.is_partner())
  WITH CHECK (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_delete" ON public.story_bank
  FOR DELETE TO authenticated USING (created_by = auth.uid() AND public.is_partner());

-- --- content_posts ---
CREATE POLICY "owner_select" ON public.content_posts
  FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_insert" ON public.content_posts
  FOR INSERT TO authenticated WITH CHECK (public.is_partner() AND created_by = auth.uid());
CREATE POLICY "owner_update" ON public.content_posts
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.is_partner())
  WITH CHECK (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_delete" ON public.content_posts
  FOR DELETE TO authenticated USING (created_by = auth.uid() AND public.is_partner());

-- --- content_news ---
CREATE POLICY "owner_select" ON public.content_news
  FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_insert" ON public.content_news
  FOR INSERT TO authenticated WITH CHECK (public.is_partner() AND created_by = auth.uid());
CREATE POLICY "owner_update" ON public.content_news
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.is_partner())
  WITH CHECK (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_delete" ON public.content_news
  FOR DELETE TO authenticated USING (created_by = auth.uid() AND public.is_partner());

-- --- commenting_opportunities ---
CREATE POLICY "owner_select" ON public.commenting_opportunities
  FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_insert" ON public.commenting_opportunities
  FOR INSERT TO authenticated WITH CHECK (public.is_partner() AND created_by = auth.uid());
CREATE POLICY "owner_update" ON public.commenting_opportunities
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.is_partner())
  WITH CHECK (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_delete" ON public.commenting_opportunities
  FOR DELETE TO authenticated USING (created_by = auth.uid() AND public.is_partner());

-- --- content_ideas ---
CREATE POLICY "owner_select" ON public.content_ideas
  FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_insert" ON public.content_ideas
  FOR INSERT TO authenticated WITH CHECK (public.is_partner() AND created_by = auth.uid());
CREATE POLICY "owner_update" ON public.content_ideas
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.is_partner())
  WITH CHECK (created_by = auth.uid() AND public.is_partner());
CREATE POLICY "owner_delete" ON public.content_ideas
  FOR DELETE TO authenticated USING (created_by = auth.uid() AND public.is_partner());

COMMIT;
