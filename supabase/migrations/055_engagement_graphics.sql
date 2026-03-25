-- Create engagement_graphics table for the graphics pipeline
CREATE TABLE IF NOT EXISTS engagement_graphics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id   UUID NOT NULL REFERENCES engagements(id)
                  ON DELETE CASCADE,
  phase_number    INTEGER NOT NULL,
  chart_type      TEXT NOT NULL,
  -- Valid chart_type values:
  -- Diagnostic: waterfall, grouped_bar, donut, summary_table,
  --             equity_trajectory, margin_compression
  -- Roadmap:    gantt, priority_matrix, recovery_ramp, roi_summary
  data_source     TEXT NOT NULL DEFAULT 'phase3_diagnostic_workbook',
  storage_path    TEXT,
  -- e.g. {engagement_id}/graphics/waterfall.png
  storage_bucket  TEXT NOT NULL DEFAULT 'engagements',
  status          TEXT NOT NULL DEFAULT 'pending',
  -- status values: pending, generated, verified, failed
  data_hash       TEXT,
  -- SHA of the canonical figures used to generate this graphic
  -- Phase 6 QC uses this to detect stale graphics
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_graphics_engagement
  ON engagement_graphics(engagement_id);

CREATE INDEX IF NOT EXISTS idx_engagement_graphics_status
  ON engagement_graphics(status);

CREATE INDEX IF NOT EXISTS idx_engagement_graphics_chart_type
  ON engagement_graphics(chart_type);

ALTER TABLE engagement_graphics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can manage engagement graphics"
  ON engagement_graphics
  FOR ALL
  USING (
    engagement_id IN (
      SELECT e.id FROM engagements e
      JOIN clients c ON c.id = e.client_id
      WHERE c.id IS NOT NULL
    )
  );

-- set_updated_at is a shared utility function used by all tables
-- that need automatic updated_at maintenance. Created here for the
-- first time -- reuse in future migrations without recreating.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_engagement_graphics_updated_at
  BEFORE UPDATE ON engagement_graphics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
