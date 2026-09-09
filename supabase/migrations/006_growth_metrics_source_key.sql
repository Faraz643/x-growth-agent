alter table public.growth_metrics drop constraint if exists growth_metrics_app_user_id_measured_on_key;
create unique index if not exists growth_metrics_user_date_source_key on public.growth_metrics(app_user_id, measured_on, data_source);
