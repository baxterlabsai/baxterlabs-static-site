CREATE TABLE phase_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase INTEGER NOT NULL CHECK (phase >= 0 AND phase <= 7),
  name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE phase_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  prompt_version INTEGER,
  executed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);
