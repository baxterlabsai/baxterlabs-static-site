CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status engagement_status NOT NULL DEFAULT 'intake',
  phase INTEGER DEFAULT 0 CHECK (phase >= 0 AND phase <= 7),
  fee NUMERIC(10,2),
  start_date DATE,
  target_end_date DATE,
  partner_lead TEXT,
  discovery_notes TEXT,
  pain_points TEXT,
  preferred_start_date DATE,
  debrief_complete BOOLEAN DEFAULT false,
  upload_token UUID UNIQUE DEFAULT gen_random_uuid(),
  deliverable_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagements_updated_at
  BEFORE UPDATE ON engagements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
