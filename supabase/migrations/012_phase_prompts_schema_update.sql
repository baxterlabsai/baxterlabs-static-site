-- 012_phase_prompts_schema_update.sql
-- Add missing columns to phase_prompts table:
--   description (TEXT, nullable)
--   timing (TEXT, nullable)
--   updated_at (TIMESTAMPTZ, default now())

ALTER TABLE phase_prompts
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS timing TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
