do $$
declare
  v_now_local timestamp := timezone('Asia/Manila', now());
  v_current_cycle date := case
    when v_now_local::time >= time '08:00'
      then v_now_local::date
    else (v_now_local::date - 1)
  end;
  v_next_reset_at timestamptz := (
    case
      when v_now_local::time >= time '08:00'
        then ((v_now_local::date + 1)::timestamp + time '08:00')
      else (v_now_local::date::timestamp + time '08:00')
    end
  ) at time zone 'Asia/Manila';
begin
  update public.ai_usage
    set message_count = case when last_reset <> v_current_cycle then 0 else message_count end,
        reserved_count = case when last_reset <> v_current_cycle then 0 else reserved_count end,
        last_reset = v_current_cycle,
        last_request_at = case when last_reset <> v_current_cycle then null else last_request_at end,
        limit_reset_at = v_next_reset_at,
        daily_limit = 20,
        updated_at = now()
  where last_reset <> v_current_cycle
     or daily_limit <> 20
     or limit_reset_at is distinct from v_next_reset_at;
end;
$$;

create or replace function public.reserve_ai_usage_slot(p_limit integer default 20)
returns public.ai_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.ai_usage;
  v_now_local timestamp := timezone('Asia/Manila', now());
  v_current_cycle date := case
    when v_now_local::time >= time '08:00'
      then v_now_local::date
    else (v_now_local::date - 1)
  end;
  v_next_reset_at timestamptz := (
    case
      when v_now_local::time >= time '08:00'
        then ((v_now_local::date + 1)::timestamp + time '08:00')
      else (v_now_local::date::timestamp + time '08:00')
    end
  ) at time zone 'Asia/Manila';
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
  values (v_user_id, 'free', 20, 0, 0, v_current_cycle, null, v_next_reset_at)
  on conflict (user_id) do nothing;

  update public.ai_usage
    set message_count = 0,
        reserved_count = 0,
        last_reset = v_current_cycle,
        last_request_at = null,
        limit_reset_at = v_next_reset_at,
        daily_limit = 20,
        updated_at = now()
    where user_id = v_user_id
      and last_reset <> v_current_cycle;

  update public.ai_usage
    set limit_reset_at = v_next_reset_at,
        daily_limit = 20,
        updated_at = now()
    where user_id = v_user_id
      and last_reset = v_current_cycle
      and (
        daily_limit <> 20
        or limit_reset_at is distinct from v_next_reset_at
      );

  update public.ai_usage
    set reserved_count = reserved_count + 1,
        daily_limit = 20,
        limit_reset_at = v_next_reset_at,
        updated_at = now()
    where user_id = v_user_id
      and last_reset = v_current_cycle
      and message_count + reserved_count < 20
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
  v_now_local timestamp := timezone('Asia/Manila', now());
  v_next_reset_at timestamptz := (
    case
      when v_now_local::time >= time '08:00'
        then ((v_now_local::date + 1)::timestamp + time '08:00')
      else (v_now_local::date::timestamp + time '08:00')
    end
  ) at time zone 'Asia/Manila';
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  update public.ai_usage
    set message_count = message_count + case when p_increment then 1 else 0 end,
        reserved_count = greatest(reserved_count - 1, 0),
        last_request_at = case when p_increment then now() else last_request_at end,
        daily_limit = 20,
        limit_reset_at = v_next_reset_at,
        updated_at = now()
    where user_id = v_user_id
    returning * into v_row;

  if not found then
    raise exception 'ai_usage row missing' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;
