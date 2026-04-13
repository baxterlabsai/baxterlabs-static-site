-- Migration 069: Link pipeline_partners to auth.users for multi-user support
-- Phase A of the multi-user migration plan
--
-- Adds auth_user_id FK, role, card_color, and display_name columns,
-- then populates them for both existing partners.

-- A2: Add new columns
ALTER TABLE pipeline_partners
  ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  ADD COLUMN role text NOT NULL DEFAULT 'partner',
  ADD COLUMN card_color text NOT NULL DEFAULT '#005454',
  ADD COLUMN display_name text;

COMMENT ON TABLE pipeline_partners IS 'Partner user profiles — linked to auth.users via auth_user_id';

-- A3: Populate for existing partners
UPDATE pipeline_partners
SET auth_user_id = '9a3603f4-88a9-449d-bba0-809043616d95',
    card_color = '#005454',
    display_name = 'George'
WHERE email = 'george@baxterlabs.ai';

UPDATE pipeline_partners
SET auth_user_id = '3d7dc0c0-b3f7-488e-ace9-e8b613d93c2b',
    card_color = '#C9A84C',
    display_name = 'Alfonso'
WHERE email = 'alfonso@baxterlabs.ai';
