CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_engagement ON activity_log(engagement_id);
CREATE INDEX idx_engagements_client ON engagements(client_id);
CREATE INDEX idx_engagements_status ON engagements(status);
CREATE INDEX idx_engagements_upload_token ON engagements(upload_token);
CREATE INDEX idx_engagements_deliverable_token ON engagements(deliverable_token);
