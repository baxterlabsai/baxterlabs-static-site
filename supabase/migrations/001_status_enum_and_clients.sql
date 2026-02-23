CREATE TYPE engagement_status AS ENUM (
  'intake', 'nda_pending', 'nda_signed', 'discovery_done',
  'agreement_pending', 'agreement_signed', 'documents_pending',
  'documents_received', 'phase_1', 'phase_2', 'phase_3',
  'phase_4', 'phase_5', 'phase_6', 'debrief',
  'wave_1_released', 'wave_2_released', 'closed'
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  primary_contact_name TEXT NOT NULL,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT,
  industry TEXT,
  revenue_range TEXT,
  employee_count TEXT,
  website_url TEXT,
  referral_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
