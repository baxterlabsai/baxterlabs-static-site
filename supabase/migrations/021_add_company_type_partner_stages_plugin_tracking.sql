-- Migration 021: Company types, partner stages, plugin tracking, PDF delivery, phase tracking
-- Adds database foundation for partner/referral tracking, multi-type pipeline management,
-- plugin activity logging, PDF delivery support, and phase tracking.

--------------------------------------------------------------------------------
-- 1. pipeline_companies: add company_type + enrichment_data
--------------------------------------------------------------------------------
ALTER TABLE pipeline_companies
  ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB;

ALTER TABLE pipeline_companies
  ADD CONSTRAINT pipeline_companies_company_type_check
  CHECK (company_type IN ('prospect', 'partner', 'connector'));

--------------------------------------------------------------------------------
-- 2. pipeline_contacts: add enrichment_data
--------------------------------------------------------------------------------
ALTER TABLE pipeline_contacts
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB;

--------------------------------------------------------------------------------
-- 3. pipeline_opportunities: replace stage constraint with 17 stages
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  DROP CONSTRAINT IF EXISTS pipeline_opportunities_stage_check;

ALTER TABLE pipeline_opportunities
  ADD CONSTRAINT pipeline_opportunities_stage_check
  CHECK (stage IN (
    -- Prospect stages (11)
    'identified', 'contacted', 'discovery_scheduled', 'nda_sent',
    'nda_signed', 'discovery_complete', 'negotiation', 'agreement_sent',
    'won', 'lost', 'dormant',
    -- Partner stages (6)
    'partner_identified', 'partner_researched', 'partner_outreach',
    'relationship_building', 'active_referrer', 'partner_dormant'
  ));

--------------------------------------------------------------------------------
-- 4. pipeline_activities: add plugin_source + replace type constraint with 16 types
--------------------------------------------------------------------------------
ALTER TABLE pipeline_activities
  ADD COLUMN IF NOT EXISTS plugin_source TEXT;

ALTER TABLE pipeline_activities
  DROP CONSTRAINT IF EXISTS pipeline_activities_type_check;

ALTER TABLE pipeline_activities
  ADD CONSTRAINT pipeline_activities_type_check
  CHECK (type IN (
    -- Existing types (8)
    'video_call', 'phone_call', 'email', 'dm',
    'linkedin', 'meeting', 'note', 'referral',
    -- New plugin/partner types (8)
    'plugin_research', 'plugin_outreach_draft', 'plugin_call_prep',
    'plugin_enrichment', 'plugin_content', 'partnership_meeting',
    'referral_received', 'referral_sent'
  ));

--------------------------------------------------------------------------------
-- 5. deliverables: add format, pdf_storage_path, pdf_filename
--------------------------------------------------------------------------------
ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_filename TEXT;

--------------------------------------------------------------------------------
-- 6. engagements: add phase_started_at
--------------------------------------------------------------------------------
ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ;

--------------------------------------------------------------------------------
-- 7. documents: add storage_bucket + status
--------------------------------------------------------------------------------
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
