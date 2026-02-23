CREATE TABLE interview_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  contact_number INTEGER NOT NULL CHECK (contact_number >= 1 AND contact_number <= 3),
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT
);
