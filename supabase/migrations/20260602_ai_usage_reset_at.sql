alter table public.ai_usage
  add column if not exists limit_reset_at timestamptz;

create index if not exists ai_usage_user_limit_reset_idx
  on public.ai_usage (user_id, limit_reset_at);

create or replace function public.reserve_ai_usage_slot(p_limit integer default 20)
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

  insert into public.ai_usage (
    user_id,
    plan_tier,
    daily_limit,
    message_count,
    reserved_count,
    last_reset,
    last_request_at,
    limit_reset_at
  )
  values (v_user_id, 'free', p_limit, 0, 0, current_date, null, null)
  on conflict (user_id) do nothing;

  update public.ai_usage
    set message_count = 0,
        reserved_count = 0,
        last_reset = current_date,
        last_request_at = null,
        limit_reset_at = null,
        daily_limit = greatest(daily_limit, p_limit),
        updated_at = now()
    where user_id = v_user_id
      and limit_reset_at is not null
      and limit_reset_at <= now();

  update public.ai_usage
    set reserved_count = reserved_count + 1,
        daily_limit = greatest(daily_limit, p_limit),
        updated_at = now()
    where user_id = v_user_id
      and (
        limit_reset_at is null
        or limit_reset_at <= now()
      )
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
        limit_reset_at = case
          when p_increment
            and limit_reset_at is null
            and message_count + 1 >= daily_limit
            then now() + interval '24 hours'
          else limit_reset_at
        end,
        updated_at = now()
    where user_id = v_user_id
    returning * into v_row;

  if not found then
    raise exception 'ai_usage row missing' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;
