CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('nda', 'agreement')),
  docusign_envelope_id TEXT,
  status TEXT DEFAULT 'pending',
  signed_pdf_path TEXT,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ
);
