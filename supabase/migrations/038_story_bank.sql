-- Migration 038: story_bank table
-- Depends on content_posts (migration 037)

CREATE TABLE story_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'Founder Journey', 'Operational Observation', 'Client Pattern',
    'Industry Data', 'Personal Lesson', 'Surprising Finding'
  )),
  raw_note TEXT NOT NULL,
  hook_draft TEXT,
  dollar_connection TEXT,
  slay_outline JSONB,
  used_in_post BOOLEAN DEFAULT false,
  used_in_post_id UUID REFERENCES content_posts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE story_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON story_bank
  FOR ALL USING (true) WITH CHECK (true);
