create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.x_accounts (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  x_user_id text not null unique,
  username text not null,
  name text not null,
  description text,
  profile_image_url text,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  tweet_count integer not null default 0,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists x_accounts_app_user_id_idx on public.x_accounts(app_user_id);

create table if not exists public.x_posts (
  id uuid primary key default gen_random_uuid(),
  x_post_id text not null unique,
  x_user_id text not null,
  text text not null,
  created_at timestamptz not null,
  public_metrics jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists x_posts_x_user_id_idx on public.x_posts(x_user_id);
create index if not exists x_posts_created_at_idx on public.x_posts(created_at desc);

create table if not exists public.niche_profiles (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null unique references public.app_users(id) on delete cascade,
  topics text[] not null default '{}',
  audience text not null default '',
  expertise text[] not null default '{}',
  voice_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.x_accounts enable row level security;
alter table public.x_posts enable row level security;
alter table public.niche_profiles enable row level security;

revoke all on public.app_users from anon, authenticated;
revoke all on public.x_accounts from anon, authenticated;
revoke all on public.x_posts from anon, authenticated;
revoke all on public.niche_profiles from anon, authenticated;
