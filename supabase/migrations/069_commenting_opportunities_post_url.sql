-- Add post_url column to commenting_opportunities
-- Captures the URL of the specific LinkedIn post being commented on,
-- as distinct from profile_url which points to the post author.
-- This column was first applied directly to the live Supabase database
-- on April 10, 2026 from a Cowork session on the old Mac during the
-- P6c LinkedIn Commenting Pre-Brief task update. This migration file
-- is being created retroactively so the repo migration history matches
-- the live schema. Use IF NOT EXISTS so re-applying against the live
-- database is a no-op.

ALTER TABLE commenting_opportunities
ADD COLUMN IF NOT EXISTS post_url TEXT NULL;
