create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  action_url text,
  category text not null,
  priority text not null,
  icon text not null,
  color text not null,
  dedupe_key text not null,
  deleted_at timestamptz,
  constraint notifications_user_dedupe_unique unique (user_id, dedupe_key)
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read)
  where deleted_at is null;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notifications_enabled boolean not null default true,
  budget_alerts boolean not null default true,
  goal_reminders boolean not null default true,
  weekly_reports boolean not null default true,
  monthly_reports boolean not null default true,
  savings_tips boolean not null default true,
  transaction_alerts boolean not null default true,
  push_enabled boolean not null default true,
  push_token text,
  push_token_platform text,
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy "notifications_select_own"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "notifications_insert_own"
  on public.notifications
  for insert
  with check (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  using (auth.uid() = user_id);

create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.notifications;
