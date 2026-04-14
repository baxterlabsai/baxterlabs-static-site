-- ============================================================================
-- 073_rls_policies_rollback.sql
-- Restores the exact RLS policies that existed before migration 073.
-- Generated from pg_policies inventory taken 2026-04-13.
--
-- To apply:  Run this SQL against the database, then DROP the is_partner()
--            function that 073 created.
-- ============================================================================

BEGIN;

-- -------------------------------------------------------
-- 1. Drop all policies created by migration 073
-- -------------------------------------------------------

-- Shared CRUD tables (14 tables x 4 policies = 56 policies)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pipeline_companies', 'pipeline_contacts', 'pipeline_opportunities',
    'pipeline_activities', 'pipeline_tasks', 'pipeline_briefings',
    'pipeline_stage_transitions', 'call_prep_sessions', 'research_intelligence',
    'phase_outputs', 'phase_output_content', 'engagement_graphics',
    'follow_up_sequences', 'invoices'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "partner_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "partner_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "partner_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "partner_delete" ON public.%I', t);
  END LOOP;
END $$;

-- Read-only shared tables (9 tables x 1 policy)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'activity_log', 'clients', 'deliverables', 'documents', 'engagements',
    'interview_contacts', 'legal_documents', 'phase_executions', 'research_documents'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "partner_select" ON public.%I', t);
  END LOOP;
END $$;

-- Personal tables (5 tables x 4 policies)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'story_bank', 'content_posts', 'content_news',
    'commenting_opportunities', 'content_ideas'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_delete" ON public.%I', t);
  END LOOP;
END $$;

-- Drop is_partner() AFTER policies that depend on it are removed
DROP FUNCTION IF EXISTS public.is_partner();

-- -------------------------------------------------------
-- 2. Recreate the original policies exactly
-- -------------------------------------------------------

-- activity_log
CREATE POLICY "Partners read activity" ON public.activity_log
  FOR SELECT TO authenticated USING (true);

-- call_prep_sessions
CREATE POLICY "authenticated_full_access" ON public.call_prep_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- clients
CREATE POLICY "Partners read clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

-- commenting_opportunities
CREATE POLICY "authenticated_full_access" ON public.commenting_opportunities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- content_ideas
CREATE POLICY "Allow all for service role" ON public.content_ideas
  FOR ALL TO public USING (true) WITH CHECK (true);

-- content_news
CREATE POLICY "authenticated_full_access" ON public.content_news
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- content_posts
CREATE POLICY "Allow all for service role" ON public.content_posts
  FOR ALL TO public USING (true) WITH CHECK (true);

-- deliverables
CREATE POLICY "Partners read deliverables" ON public.deliverables
  FOR SELECT TO authenticated USING (true);

-- documents
CREATE POLICY "Partners read documents" ON public.documents
  FOR SELECT TO authenticated USING (true);

-- engagement_graphics
CREATE POLICY "Partners can manage engagement graphics" ON public.engagement_graphics
  FOR ALL TO public
  USING (engagement_id IN (
    SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.id IS NOT NULL
  ));

-- engagements
CREATE POLICY "Partners read engagements" ON public.engagements
  FOR SELECT TO authenticated USING (true);

-- follow_up_sequences
CREATE POLICY "Service role full access on follow_up_sequences" ON public.follow_up_sequences
  FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- interview_contacts
CREATE POLICY "Partners read contacts" ON public.interview_contacts
  FOR SELECT TO authenticated USING (true);

-- invoices
CREATE POLICY "Service role full access on invoices" ON public.invoices
  FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read invoices" ON public.invoices
  FOR SELECT TO public
  USING (auth.role() = 'authenticated');

-- legal_documents
CREATE POLICY "Partners read legal" ON public.legal_documents
  FOR SELECT TO authenticated USING (true);

-- phase_executions
CREATE POLICY "Partners read executions" ON public.phase_executions
  FOR SELECT TO authenticated USING (true);

-- phase_output_content
CREATE POLICY "Authenticated full access" ON public.phase_output_content
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- phase_outputs
CREATE POLICY "Authenticated users can insert phase_outputs" ON public.phase_outputs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read phase_outputs" ON public.phase_outputs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update phase_outputs" ON public.phase_outputs
  FOR UPDATE TO authenticated USING (true);

-- pipeline_activities
CREATE POLICY "authenticated_full_access" ON public.pipeline_activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pipeline_briefings
CREATE POLICY "authenticated_full_access" ON public.pipeline_briefings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pipeline_companies
CREATE POLICY "authenticated_full_access" ON public.pipeline_companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pipeline_contacts
CREATE POLICY "authenticated_full_access" ON public.pipeline_contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pipeline_opportunities
CREATE POLICY "authenticated_full_access" ON public.pipeline_opportunities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pipeline_stage_transitions
CREATE POLICY "authenticated_full_access" ON public.pipeline_stage_transitions
  FOR ALL TO public
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- pipeline_tasks
CREATE POLICY "authenticated_full_access" ON public.pipeline_tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- research_documents
CREATE POLICY "Partners read research" ON public.research_documents
  FOR SELECT TO authenticated USING (true);

-- research_intelligence
CREATE POLICY "authenticated_full_access" ON public.research_intelligence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- story_bank
CREATE POLICY "Allow all for service role" ON public.story_bank
  FOR ALL TO public USING (true) WITH CHECK (true);

COMMIT;
