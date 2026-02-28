-- Migration 020: Pipeline Website Intake
-- Adds source tracking and interview contacts JSON storage to pipeline_opportunities
-- for website inbound leads.

--------------------------------------------------------------------------------
-- 1. Add source column — tracks origin of the opportunity
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS source TEXT;

--------------------------------------------------------------------------------
-- 2. Add interview_contacts_json — stores raw interview contacts from website form
--    as [{name, title, email, phone, linkedin_url}], consumed during conversion
--------------------------------------------------------------------------------
ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS interview_contacts_json JSONB DEFAULT NULL;
