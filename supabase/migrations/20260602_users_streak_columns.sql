alter table public.users
  add column if not exists current_streak integer not null default 0,
  add column if not exists last_active_date text,
  add column if not exists longest_streak integer not null default 0;
