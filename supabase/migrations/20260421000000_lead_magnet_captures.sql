-- Lead magnet funnel capture tables
-- Public marketing-site prospect captures (anonymous INSERT only, no SELECT).
--
-- IMPORTANT: clients must generate row ids themselves and insert without
-- RETURNING. PostgreSQL requires a SELECT policy for the RETURNING clause
-- to succeed, and this table intentionally has none. See src/lib/supabase.ts.

create table if not exists public.lead_magnet_captures (
  id uuid primary key default gen_random_uuid(),
  asset text not null check (asset in ('field_guide', 'self_assessment')),
  name text not null,
  email text not null,
  company_name text not null,
  revenue_range text,
  role text,
  captured_at timestamptz not null default now()
);

create index if not exists lead_magnet_captures_asset_captured_at_idx
  on public.lead_magnet_captures (asset, captured_at desc);

create index if not exists lead_magnet_captures_email_idx
  on public.lead_magnet_captures (email);

alter table public.lead_magnet_captures enable row level security;

create policy "lead_magnet_captures_anon_insert"
  on public.lead_magnet_captures
  for insert
  to anon
  with check (true);


create table if not exists public.self_assessment_scores (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid references public.lead_magnet_captures(id) on delete cascade,
  answers jsonb not null,
  total_score int not null check (total_score between 12 and 60),
  band text not null check (band in ('low', 'moderate', 'high')),
  revenue_range text not null,
  exposure_low int not null,
  exposure_high int not null,
  industry text,
  created_at timestamptz not null default now()
);

create index if not exists self_assessment_scores_created_at_idx
  on public.self_assessment_scores (created_at desc);

create index if not exists self_assessment_scores_band_score_idx
  on public.self_assessment_scores (band, total_score);

alter table public.self_assessment_scores enable row level security;

create policy "self_assessment_scores_anon_insert"
  on public.self_assessment_scores
  for insert
  to anon
  with check (true);
