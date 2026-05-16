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

create table if not exists releases (
  id text primary key,
  name text not null,
  season text not null default '',
  launch_date text not null default '',
  status text not null,
  summary text not null default '',
  content_status text not null,
  readiness_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists releases_launch_date_idx on releases (launch_date asc);
create index if not exists releases_status_idx on releases (status);

create table if not exists release_tasks (
  id text primary key,
  release_id text not null,
  title text not null,
  status text not null,
  owner text not null default '',
  due_date text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists release_tasks_release_id_idx on release_tasks (release_id);
create index if not exists release_tasks_status_due_date_idx on release_tasks (status, due_date);

create table if not exists release_partners (
  release_id text not null,
  partner_id text not null,
  role text not null default '',
  created_at timestamptz not null default now(),
  primary key (release_id, partner_id)
);

create index if not exists release_partners_release_id_idx on release_partners (release_id);
create index if not exists release_partners_partner_id_idx on release_partners (partner_id);

create table if not exists web_ops_items (
  id text primary key,
  release_id text not null default '',
  title text not null,
  kind text not null,
  status text not null,
  summary text not null default '',
  body text not null default '',
  target_url text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  seo_keywords text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  assignee text not null default '',
  due_date text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_ops_items_release_id_idx on web_ops_items (release_id);
create index if not exists web_ops_items_status_idx on web_ops_items (status);
create index if not exists web_ops_items_kind_idx on web_ops_items (kind);

create table if not exists legal_notes (
  id text primary key,
  title text not null,
  topic text not null default '',
  jurisdiction text not null default '',
  risk_level text not null,
  status text not null,
  summary text not null default '',
  body text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  source_links text not null default '',
  next_action text not null default '',
  next_action_due text not null default '',
  responsible text not null default '',
  release_id text not null default '',
  partner_id text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_notes_risk_level_idx on legal_notes (risk_level);
create index if not exists legal_notes_status_idx on legal_notes (status);
create index if not exists legal_notes_jurisdiction_idx on legal_notes (jurisdiction);

create table if not exists creative_briefs (
  id text primary key,
  title text not null,
  goal text not null default '',
  audience text not null default '',
  tone text not null default '',
  "references" text not null default '',
  season text not null default '',
  release_id text not null default '',
  status text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_briefs_status_idx on creative_briefs (status);
create index if not exists creative_briefs_release_id_idx on creative_briefs (release_id);

create table if not exists creative_directions (
  id text primary key,
  brief_id text not null,
  title text not null,
  summary text not null default '',
  body text not null default '',
  keywords text not null default '',
  palette text not null default '',
  materials text not null default '',
  silhouettes text not null default '',
  prompt_used text not null default '',
  model_used text not null default '',
  source text not null,
  saved boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_directions_brief_id_idx on creative_directions (brief_id);

create table if not exists prompt_templates (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null default '',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mockup_jobs (
  id text primary key,
  prompt text not null,
  reference_notes text not null default '',
  aspect_ratio text not null default '1:1',
  quality text not null default 'standard',
  status text not null,
  model_used text not null default '',
  image_url text not null default '',
  image_data text not null default '',
  mime_type text not null default '',
  error text not null default '',
  release_id text not null default '',
  brief_id text not null default '',
  notes text not null default '',
  reference_images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mockup_jobs add column if not exists reference_images jsonb not null default '[]'::jsonb;

create index if not exists mockup_jobs_status_idx on mockup_jobs (status);
create index if not exists mockup_jobs_brief_id_idx on mockup_jobs (brief_id);
create index if not exists mockup_jobs_release_id_idx on mockup_jobs (release_id);
