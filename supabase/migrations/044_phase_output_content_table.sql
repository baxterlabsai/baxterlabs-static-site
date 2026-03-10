-- New table for Cowork-synced phase outputs with versioning
CREATE TABLE IF NOT EXISTS phase_output_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 0 AND 7),
    output_name TEXT NOT NULL,
    output_type TEXT NOT NULL CHECK (output_type IN ('md', 'xlsx', 'docx', 'pptx')),
    content_md TEXT,
    storage_path TEXT,
    pdf_storage_path TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_phase_output_content_engagement ON phase_output_content(engagement_id);
CREATE INDEX idx_phase_output_content_lookup ON phase_output_content(engagement_id, phase_number, output_name, version);

ALTER TABLE phase_output_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON phase_output_content
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_phase_output_content_updated_at
    BEFORE UPDATE ON phase_output_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
