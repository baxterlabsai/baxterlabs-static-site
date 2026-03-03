-- Migration 029: Connector refactor — connectors are contacts, not a company type
-- DEPLOY SEQUENCE: code first (handles both states), then this migration

-- Add is_connector flag to contacts
ALTER TABLE pipeline_contacts
  ADD COLUMN IF NOT EXISTS is_connector BOOLEAN NOT NULL DEFAULT false;

-- Index for the connectors tab query
CREATE INDEX IF NOT EXISTS idx_contacts_connector
  ON pipeline_contacts(is_connector)
  WHERE is_connector = true AND is_deleted = false;
