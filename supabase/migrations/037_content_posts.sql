-- Migration 037: content_posts table
-- Must be applied before story_bank (which references this table)

CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('linkedin', 'blog')),
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'idea', 'draft', 'review', 'scheduled', 'published', 'archived'
  )),
  platform TEXT CHECK (platform IN ('linkedin', 'blog', 'both')),
  scheduled_date TIMESTAMPTZ,
  published_date TIMESTAMPTZ,
  impressions INTEGER,
  engagement_rate DECIMAL(5,2),
  comments INTEGER,
  likes INTEGER,
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 8),
  score_notes TEXT,
  seo_title TEXT,
  seo_description TEXT,
  featured_image_url TEXT,
  blog_slug TEXT UNIQUE,
  published BOOLEAN DEFAULT false,
  source_post_id UUID REFERENCES content_posts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON content_posts
  FOR ALL USING (true) WITH CHECK (true);
