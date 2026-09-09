alter table public.niche_profiles add column if not exists content_pillars text[] not null default '{}';
alter table public.niche_profiles add column if not exists tone text[] not null default '{}';
alter table public.niche_profiles add column if not exists avoid_topics text[] not null default '{}';
alter table public.niche_profiles add column if not exists target_followers integer not null default 1000;

drop table if exists public.growth_profiles;
