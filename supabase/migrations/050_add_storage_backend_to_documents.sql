-- Add storage_backend column to documents (drive vs supabase)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_backend TEXT DEFAULT 'supabase';
