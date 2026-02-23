CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('exec_summary', 'full_report', 'workbook', 'roadmap', 'deck', 'retainer_proposal')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'released')),
  wave INTEGER NOT NULL CHECK (wave IN (1, 2)),
  storage_path TEXT,
  approved_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);
