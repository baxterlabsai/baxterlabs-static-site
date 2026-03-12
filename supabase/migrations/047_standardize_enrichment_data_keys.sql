-- Migration 047: Standardize enrichment_data JSONB key names on pipeline_companies
--
-- Canonical enrichment_data keys (going forward):
--   "research"              — web research / company overview text
--   "enrichment"            — firmographic enrichment data
--   "discovery_transcript"  — raw discovery call transcript
--   "discovery_summary"     — LLM-generated summary of discovery call
--
-- DEPRECATED keys (will be migrated to dedicated tables):
--   "call_prep"   → use call_prep_sessions table instead
--   "enrichment"  → use research_intelligence table (category='enrichment') instead
--
-- This step adds a COMMENT on the column to document the canonical schema.
-- No data is modified — existing rows keep their current keys intact.

COMMENT ON COLUMN pipeline_companies.enrichment_data IS
'JSONB — canonical keys: research, enrichment, discovery_transcript, discovery_summary. '
'DEPRECATED keys: call_prep (→ call_prep_sessions table), enrichment (→ research_intelligence table). '
'New code should write to the dedicated tables instead of adding new keys here.';
