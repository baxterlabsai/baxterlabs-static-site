-- Add queued_for_draft flag to story_bank for content queue workflow
ALTER TABLE story_bank ADD COLUMN queued_for_draft boolean NOT NULL DEFAULT false;
