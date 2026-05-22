create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_tier text not null default 'free',
  daily_limit integer not null default 20,
  message_count integer not null default 0,
  reserved_count integer not null default 0,
  last_reset date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_usage_user_unique unique (user_id),
  constraint ai_usage_daily_limit_positive check (daily_limit > 0),
  constraint ai_usage_message_count_nonnegative check (message_count >= 0),
  constraint ai_usage_reserved_count_nonnegative check (reserved_count >= 0)
);

create index if not exists ai_usage_user_updated_idx
  on public.ai_usage (user_id, updated_at desc);

drop trigger if exists ai_usage_set_updated_at on public.ai_usage;
create trigger ai_usage_set_updated_at
  before update on public.ai_usage
  for each row
  execute procedure public.set_updated_at();

alter table public.ai_usage enable row level security;

create policy "ai_usage_select_own"
  on public.ai_usage
  for select
  using (auth.uid() = user_id);

create policy "ai_usage_insert_own"
  on public.ai_usage
  for insert
  with check (auth.uid() = user_id);

create policy "ai_usage_update_own"
  on public.ai_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.reserve_ai_usage_slot(p_limit integer default 20)
returns public.ai_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_row public.ai_usage;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  insert into public.ai_usage (user_id, plan_tier, daily_limit, message_count, reserved_count, last_reset)
  values (v_user_id, 'free', p_limit, 0, 0, v_today)
  on conflict (user_id) do nothing;

  update public.ai_usage
    set message_count = 0,
        reserved_count = 0,
        last_reset = v_today,
        daily_limit = greatest(daily_limit, p_limit),
        updated_at = now()
    where user_id = v_user_id
      and last_reset <> v_today;

  update public.ai_usage
    set reserved_count = reserved_count + 1,
        daily_limit = greatest(daily_limit, p_limit),
        updated_at = now()
    where user_id = v_user_id
      and last_reset = v_today
      and message_count + reserved_count < greatest(daily_limit, p_limit)
    returning * into v_row;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;

create or replace function public.finalize_ai_usage_slot(p_increment boolean default true)
returns public.ai_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.ai_usage;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  update public.ai_usage
    set message_count = message_count + case when p_increment then 1 else 0 end,
        reserved_count = greatest(reserved_count - 1, 0),
        updated_at = now()
    where user_id = v_user_id
    returning * into v_row;

  if not found then
    raise exception 'ai_usage row missing' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;