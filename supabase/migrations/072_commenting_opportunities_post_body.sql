-- Add post_body column to commenting_opportunities
-- Stores the full verbatim text of the LinkedIn post being commented on.
-- Populated by the commenting pre-brief scheduled task starting in v2.5.0.
-- Nullable because older rows (pre-v2.5.0) only have post_summary.

ALTER TABLE commenting_opportunities
ADD COLUMN post_body TEXT;

COMMENT ON COLUMN commenting_opportunities.post_body IS
  'Full verbatim text of the LinkedIn post being commented on. Populated by the commenting pre-brief scheduled task starting in v2.5.0. Nullable because older rows (pre-v2.5.0) only have post_summary.';
