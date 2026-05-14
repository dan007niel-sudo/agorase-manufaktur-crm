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
