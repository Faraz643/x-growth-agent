alter table public.x_posts add column if not exists data_source text not null default 'x_api';
alter table public.post_performance add column if not exists data_source text not null default 'x_api';
alter table public.growth_metrics add column if not exists data_source text not null default 'x_api';

create index if not exists x_posts_source_user_date_idx on public.x_posts(data_source, x_user_id, created_at desc);
create index if not exists growth_metrics_source_user_date_idx on public.growth_metrics(data_source, app_user_id, measured_on desc);
create index if not exists post_performance_source_user_date_idx on public.post_performance(data_source, app_user_id, measured_at desc);
