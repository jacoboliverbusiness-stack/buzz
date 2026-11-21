-- Scout by Recrua — initial schema.
-- Shared research (programs, rosters, coaches) is written only by the server (service role).
-- Athlete data (scans) is readable only by its owner.

create table if not exists programs (
  id text primary key,
  sport text not null,
  school text not null,
  division text not null,
  conference text,
  city text not null,
  state char(2) not null,
  athletics_url text not null,
  roster_path text,
  staff_path text,
  academic_tier text,
  verified_at timestamptz
);

create table if not exists roster_snapshots (
  id bigint generated always as identity primary key,
  program_id text not null,
  season int not null,
  source_url text not null,
  fetched_at timestamptz not null,
  data jsonb not null
);
create index if not exists roster_snapshots_program on roster_snapshots (program_id, fetched_at desc);

create table if not exists coaches (
  id text primary key,
  program_id text not null,
  name text not null,
  title text not null,
  role text not null,
  email text,
  verification text not null,
  source_url text not null,
  last_verified_at timestamptz not null,
  active boolean not null default true,
  data jsonb not null
);
create index if not exists coaches_program on coaches (program_id) where active;

create table if not exists scans (
  id uuid primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  access_token text not null,
  status text not null,
  sport text,
  grad_year int,
  cost_usd numeric(10,4) not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scans_owner on scans (owner_id, created_at desc);

create table if not exists subscriptions (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null,
  status text not null,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz
);

create table if not exists usage_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  metric text not null,
  qty numeric not null,
  at timestamptz not null default now()
);
create index if not exists usage_owner_metric on usage_events (owner_id, metric, at);

create table if not exists cost_ledger (
  id bigint generated always as identity primary key,
  scan_id uuid,
  owner_id uuid,
  kind text not null,
  detail text,
  usd numeric(10,5) not null,
  at timestamptz not null default now()
);

alter table programs enable row level security;
alter table roster_snapshots enable row level security;
alter table coaches enable row level security;
alter table scans enable row level security;
alter table subscriptions enable row level security;
alter table usage_events enable row level security;
alter table cost_ledger enable row level security;

-- Owners can read their own records; all writes go through the server.
create policy "own scans" on scans for select using (auth.uid() = owner_id);
create policy "own subscription" on subscriptions for select using (auth.uid() = owner_id);
create policy "own usage" on usage_events for select using (auth.uid() = owner_id);
