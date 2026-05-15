create table if not exists partners (
  id text primary key,
  name text not null,
  contact_person text not null default '',
  category text not null,
  city text not null default '',
  region text not null default '',
  country text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  social text not null default '',
  products text not null default '',
  price_level text not null,
  brand_fit text not null,
  cooperation_potential text not null,
  status text not null,
  priority text not null,
  source text not null default '',
  last_contact text not null default '',
  next_follow_up text not null default '',
  next_step text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partners_updated_at_idx on partners (updated_at desc);

create table if not exists tasks (
  id text primary key,
  title text not null,
  section text not null,
  status text not null,
  priority text not null,
  partner_id text not null default '',
  due_date text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_due_date_idx on tasks (status, due_date);
create index if not exists tasks_partner_id_idx on tasks (partner_id);

create table if not exists partner_events (
  id text primary key,
  partner_id text not null,
  type text not null,
  title text not null,
  body text not null default '',
  event_date text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_events_partner_id_idx on partner_events (partner_id);
create index if not exists partner_events_event_date_idx on partner_events (event_date desc);

create table if not exists partner_evaluations (
  id text primary key,
  partner_id text not null,
  fit_score integer not null,
  quality_score integer not null,
  terms_score integer not null,
  risk_score integer not null,
  readiness_score integer not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_evaluations_partner_id_idx on partner_evaluations (partner_id);

create table if not exists production_profiles (
  partner_id text primary key,
  capabilities text not null default '',
  materials text not null default '',
  moq text not null default '',
  lead_time text not null default '',
  certifications text not null default '',
  cost_notes text not null default '',
  quality_notes text not null default '',
  readiness_status text not null default 'unknown',
  readiness_score integer not null default 0,
  blocker text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists production_profiles_readiness_status_idx on production_profiles (readiness_status);

create table if not exists sample_requests (
  id text primary key,
  partner_id text not null,
  title text not null,
  status text not null,
  requested_at text not null default '',
  target_date text not null default '',
  cost_estimate text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sample_requests_partner_id_idx on sample_requests (partner_id);
create index if not exists sample_requests_status_target_date_idx on sample_requests (status, target_date);
