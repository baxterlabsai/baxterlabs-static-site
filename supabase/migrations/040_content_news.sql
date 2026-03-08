-- Content News: articles sourced from Google Alerts, scored for ICP relevance
CREATE TABLE content_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  source_publication TEXT,
  article_url TEXT NOT NULL,
  excerpt TEXT,
  full_text TEXT,
  relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 10),
  relevance_reason TEXT,
  alert_topic TEXT,
  status TEXT DEFAULT 'unreviewed' CHECK (status IN (
    'unreviewed', 'queued', 'used', 'dismissed'
  )),
  gmail_message_id TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  used_in_post_id UUID REFERENCES content_posts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE content_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage content_news"
  ON content_news FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
