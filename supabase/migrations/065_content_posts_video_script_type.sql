-- ============================================================================
-- 065_content_posts_video_script_type.sql
-- Created: 2026-04-06
-- Purpose: Add 'video_script' as a valid content_posts.type value for
--          Cowork scheduled task "Video Script Prep" (Tuesdays).
--
-- Write-back contract (Cowork → Supabase MCP):
--   Cowork writes one row per Tuesday with type='video_script',
--   status='draft' via execute_sql with service_role key.
--   Existing content_posts endpoints and calendar surface these
--   automatically via the existing type filter.
--
-- Rollback: To revert, run:
--   ALTER TABLE content_posts DROP CONSTRAINT content_posts_type_check;
--   ALTER TABLE content_posts ADD CONSTRAINT content_posts_type_check
--     CHECK (type IN ('linkedin', 'blog'));
-- ============================================================================

ALTER TABLE content_posts DROP CONSTRAINT content_posts_type_check;

ALTER TABLE content_posts ADD CONSTRAINT content_posts_type_check
  CHECK (type IN ('linkedin', 'blog', 'video_script'));
