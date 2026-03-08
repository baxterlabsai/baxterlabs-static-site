-- Migration 039: content_ideas table

CREATE TABLE content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  dollar_hook TEXT,
  insider_detail TEXT,
  status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'assigned', 'used')),
  assigned_week DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON content_ideas
  FOR ALL USING (true) WITH CHECK (true);
