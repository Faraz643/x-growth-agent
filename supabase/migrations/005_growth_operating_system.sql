-- Growth Operating System extensions. All records remain scoped to app_users.
alter table public.opportunities add column if not exists data_source text not null default 'manual';
alter table public.content_ideas add column if not exists data_source text not null default 'generated';
alter table public.relationships add column if not exists next_action text not null default '';
alter table public.relationships add column if not exists last_topic text not null default '';
alter table public.content_drafts add column if not exists source_context jsonb not null default '{}'::jsonb;

create table if not exists public.growth_projects (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  description text not null default '',
  stage text not null default 'building',
  lessons text[] not null default '{}',
  technologies text[] not null default '{}',
  urls text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_recommendations (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('content','reply','opportunity','relationship','analytics','calendar')),
  title text not null,
  reason text not null default '',
  score integer not null default 0 check (score between 0 and 100),
  reference_id uuid,
  status text not null default 'open' check (status in ('open','saved','approved','rejected','completed','expired')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_variants (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  variant_type text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.growth_research (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  topic text not null,
  summary text not null,
  source_type text not null default 'manual',
  source_url text,
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  momentum_score integer not null default 0 check (momentum_score between 0 and 100),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists growth_projects_user_active_idx on public.growth_projects(app_user_id, active, updated_at desc);
create index if not exists growth_recommendations_user_status_idx on public.growth_recommendations(app_user_id, status, score desc, created_at desc);
create index if not exists content_variants_user_draft_idx on public.content_variants(app_user_id, draft_id, created_at desc);
create index if not exists growth_research_user_topic_idx on public.growth_research(app_user_id, topic, relevance_score desc, created_at desc);

alter table public.growth_projects enable row level security;
alter table public.growth_recommendations enable row level security;
alter table public.content_variants enable row level security;
alter table public.growth_research enable row level security;
revoke all on public.growth_projects, public.growth_recommendations, public.content_variants, public.growth_research from anon, authenticated;
