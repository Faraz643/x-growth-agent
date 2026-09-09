alter table public.x_accounts add column if not exists last_successful_sync_at timestamptz;
alter table public.x_accounts add column if not exists sync_status text not null default 'never_synced';
alter table public.x_accounts add column if not exists sync_error_code text;

create table if not exists public.growth_profiles (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null unique references public.app_users(id) on delete cascade,
  niche text not null default 'Development + AI + Product Building + Vibe Coding',
  content_pillars text[] not null default '{}',
  tone text[] not null default '{}',
  avoid_topics text[] not null default '{}',
  target_followers integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  reason text not null default '',
  angle text not null default '',
  hook text not null default '',
  score integer not null default 0 check (score between 0 and 100),
  source_type text not null default 'generated',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  idea_id uuid references public.content_ideas(id) on delete set null,
  format text not null,
  body text not null,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  planned_date date not null,
  pillar text not null,
  format text not null,
  draft_id uuid references public.content_drafts(id) on delete set null,
  status text not null default 'planned',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(app_user_id, planned_date)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  author_username text not null,
  author_name text not null default '',
  topic text not null,
  content text not null,
  reason text not null default '',
  suggested_angle text not null default '',
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  momentum_score integer not null default 0 check (momentum_score between 0 and 100),
  conversation_score integer not null default 0 check (conversation_score between 0 and 100),
  opportunity_score integer not null default 0 check (opportunity_score between 0 and 100),
  source_type text not null default 'demo',
  source_url text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reply_suggestions (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  author_username text not null,
  source_content text not null,
  reply text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  x_username text not null,
  display_name text not null default '',
  niche text not null default '',
  interaction_count integer not null default 0,
  last_interaction_at timestamptz,
  topics text[] not null default '{}',
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  relationship_status text not null default 'NEW',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(app_user_id, x_username)
);

create table if not exists public.post_performance (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  x_post_id text not null,
  measured_at timestamptz not null default now(),
  impressions integer not null default 0,
  likes integer not null default 0,
  replies integer not null default 0,
  reposts integer not null default 0,
  quotes integer not null default 0,
  engagement_rate numeric(8,4),
  performance_score numeric(8,2),
  unique(app_user_id, x_post_id, measured_at)
);

create table if not exists public.growth_metrics (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  measured_on date not null,
  followers integer,
  following integer,
  post_count integer,
  profile_visits integer,
  impressions bigint,
  likes integer,
  replies integer,
  reposts integer,
  engagement_rate numeric(8,4),
  unique(app_user_id, measured_on)
);

create table if not exists public.growth_actions (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  action_type text not null,
  reference_id uuid,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists content_ideas_user_status_idx on public.content_ideas(app_user_id, status, score desc);
create index if not exists content_drafts_user_status_idx on public.content_drafts(app_user_id, status, created_at desc);
create index if not exists opportunities_user_status_score_idx on public.opportunities(app_user_id, status, opportunity_score desc);
create index if not exists replies_user_status_idx on public.reply_suggestions(app_user_id, status, created_at desc);
create index if not exists relationships_user_status_idx on public.relationships(app_user_id, relationship_status, relevance_score desc);
create index if not exists post_performance_user_date_idx on public.post_performance(app_user_id, measured_at desc);
create index if not exists growth_metrics_user_date_idx on public.growth_metrics(app_user_id, measured_on desc);
create index if not exists growth_actions_user_status_idx on public.growth_actions(app_user_id, status, created_at desc);

alter table public.growth_profiles enable row level security;
alter table public.content_ideas enable row level security;
alter table public.content_drafts enable row level security;
alter table public.content_calendar enable row level security;
alter table public.opportunities enable row level security;
alter table public.reply_suggestions enable row level security;
alter table public.relationships enable row level security;
alter table public.post_performance enable row level security;
alter table public.growth_metrics enable row level security;
alter table public.growth_actions enable row level security;

revoke all on public.growth_profiles, public.content_ideas, public.content_drafts, public.content_calendar, public.opportunities, public.reply_suggestions, public.relationships, public.post_performance, public.growth_metrics, public.growth_actions from anon, authenticated;
