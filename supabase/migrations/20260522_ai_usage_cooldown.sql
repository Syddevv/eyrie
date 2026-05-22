alter table public.ai_usage
  add column if not exists last_request_at timestamptz;

alter table public.ai_usage
  alter column daily_limit set default 50;

update public.ai_usage
  set daily_limit = greatest(daily_limit, 50)
  where daily_limit < 50;

create index if not exists ai_usage_user_last_request_idx
  on public.ai_usage (user_id, last_request_at desc);

create or replace function public.reserve_ai_usage_slot(p_limit integer default 50)
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

  insert into public.ai_usage (user_id, plan_tier, daily_limit, message_count, reserved_count, last_reset, last_request_at)
  values (v_user_id, 'free', p_limit, 0, 0, v_today, null)
  on conflict (user_id) do nothing;

  update public.ai_usage
    set message_count = 0,
        reserved_count = 0,
        last_reset = v_today,
        last_request_at = null,
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
        last_request_at = case when p_increment then now() else last_request_at end,
        updated_at = now()
    where user_id = v_user_id
    returning * into v_row;

  if not found then
    raise exception 'ai_usage row missing' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;
