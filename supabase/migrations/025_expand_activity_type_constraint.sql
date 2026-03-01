-- Expand pipeline_activities type CHECK to accept non-prefixed plugin types
-- (research, outreach_draft, call_prep, enrichment) alongside existing plugin_ prefixed versions.
-- This allows the Cowork Sales Plugin to write activities without the plugin_ prefix.

ALTER TABLE pipeline_activities DROP CONSTRAINT IF EXISTS pipeline_activities_type_check;

ALTER TABLE pipeline_activities ADD CONSTRAINT pipeline_activities_type_check
  CHECK (type IN (
    'video_call', 'phone_call', 'email', 'dm', 'linkedin', 'meeting', 'note', 'referral',
    'plugin_research', 'plugin_outreach_draft', 'plugin_call_prep', 'plugin_enrichment', 'plugin_content',
    'partnership_meeting', 'referral_received', 'referral_sent',
    'research', 'outreach_draft', 'call_prep', 'enrichment'
  ));
