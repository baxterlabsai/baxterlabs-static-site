-- Migration 017: Create phase_outputs table for tracking all outputs across 8 phases (Task 7a)

CREATE TABLE IF NOT EXISTS phase_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  phase integer NOT NULL,
  output_number integer NOT NULL,
  name text NOT NULL,
  description text,
  file_type text,
  destination_folder text NOT NULL,
  storage_path text,
  file_size bigint,
  status text NOT NULL DEFAULT 'pending',
  is_review_gate boolean DEFAULT false,
  is_client_deliverable boolean DEFAULT false,
  wave integer,
  uploaded_at timestamptz,
  accepted_at timestamptz,
  accepted_by text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phase_outputs_engagement_id ON phase_outputs (engagement_id);
CREATE INDEX IF NOT EXISTS idx_phase_outputs_phase ON phase_outputs (engagement_id, phase);

-- RLS
ALTER TABLE phase_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read phase_outputs"
  ON phase_outputs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert phase_outputs"
  ON phase_outputs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update phase_outputs"
  ON phase_outputs FOR UPDATE
  TO authenticated
  USING (true);
