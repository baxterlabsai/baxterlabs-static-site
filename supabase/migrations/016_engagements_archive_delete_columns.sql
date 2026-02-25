-- Migration 016: Add archived_at, is_deleted, deleted_at columns to engagements table
-- Supports soft-delete and archive tracking (Task 6c)

ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Index for filtering out deleted engagements efficiently
CREATE INDEX IF NOT EXISTS idx_engagements_is_deleted ON engagements (is_deleted);
