CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('financial', 'payroll', 'vendor', 'revenue', 'operations', 'legal')),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
