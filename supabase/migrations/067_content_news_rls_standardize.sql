-- ============================================================================
-- 067_content_news_rls_standardize.sql
-- Created: 2026-04-08
-- Purpose: Standardize content_news RLS policy to match the convention used
--          by newer tables (pipeline_briefings, weekly_metrics_rollups,
--          commenting_opportunities). Replaces the old auth.role() check with
--          the simpler authenticated_full_access pattern.
--          Also enables Supabase Realtime on content_ideas (missed in 066).
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage content_news" ON content_news;

CREATE POLICY "authenticated_full_access" ON content_news
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime on content_ideas (omitted from 066_enable_realtime.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'content_ideas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE content_ideas;
  END IF;
END $$;
