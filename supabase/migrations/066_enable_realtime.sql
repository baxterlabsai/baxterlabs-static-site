-- ============================================================================
-- 066_enable_realtime.sql
-- Created: 2026-04-06
-- Purpose: Enable Supabase Realtime on all dashboard-relevant tables so
--          the frontend auto-updates without page reload.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'pipeline_companies','pipeline_contacts','pipeline_opportunities',
    'pipeline_activities','pipeline_tasks','pipeline_partners',
    'engagements','clients','deliverables','phase_outputs',
    'phase_output_content','documents','interview_contacts',
    'legal_documents','research_documents','invoices',
    'follow_up_sequences','content_posts','content_news','story_bank',
    'pipeline_briefings','weekly_metrics_rollups','commenting_opportunities'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
