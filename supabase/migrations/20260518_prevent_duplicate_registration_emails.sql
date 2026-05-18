create or replace function public.get_email_registration_status(target_email text)
returns table (
  normalized_email text,
  exists_in_auth boolean,
  exists_in_users boolean,
  matching_user_id uuid,
  has_google boolean,
  has_email boolean,
  recommended_provider text
)
language sql
security definer
set search_path = public, auth
stable
as $$
  with normalized as (
    select nullif(lower(trim(target_email)), '') as email
  ),
  auth_match as (
    select
      u.id,
      coalesce(bool_or(i.provider = 'google'), false) as has_google,
      coalesce(bool_or(i.provider = 'email'), false) as has_email
    from auth.users u
    left join auth.identities i on i.user_id = u.id
    where lower(trim(u.email)) = (select email from normalized)
      and u.deleted_at is null
    group by u.id, u.created_at
    order by u.created_at asc
    limit 1
  ),
  public_match as (
    select pu.id
    from public.users pu
    where lower(trim(pu.email)) = (select email from normalized)
      and pu.deleted_at is null
    order by pu.created_at asc
    limit 1
  )
  select
    normalized.email as normalized_email,
    exists(select 1 from auth_match) as exists_in_auth,
    exists(select 1 from public_match) as exists_in_users,
    coalesce(
      (select id from auth_match),
      (select id from public_match)
    ) as matching_user_id,
    coalesce((select has_google from auth_match), false) as has_google,
    coalesce((select has_email from auth_match), false) as has_email,
    case
      when coalesce((select has_google from auth_match), false)
        and not coalesce((select has_email from auth_match), false) then 'google'
      when exists(select 1 from auth_match) or exists(select 1 from public_match) then 'email'
      else null
    end as recommended_provider
  from normalized
  where normalized.email is not null;
$$;

revoke all on function public.get_email_registration_status(text) from public;
grant execute on function public.get_email_registration_status(text) to anon;
grant execute on function public.get_email_registration_status(text) to authenticated;

create or replace function public.prevent_duplicate_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text;
  existing_auth_match boolean := false;
  existing_has_google boolean := false;
  existing_has_email boolean := false;
begin
  normalized_email := nullif(lower(trim(new.email)), '');

  if normalized_email is null then
    return new;
  end if;

  new.email := normalized_email;

  select
    count(*) > 0,
    coalesce(bool_or(i.provider = 'google'), false),
    coalesce(bool_or(i.provider = 'email'), false)
  into existing_auth_match, existing_has_google, existing_has_email
  from auth.users u
  left join auth.identities i on i.user_id = u.id
  where u.id <> new.id
    and lower(trim(u.email)) = normalized_email
    and u.deleted_at is null;

  if existing_auth_match then
    if existing_has_google and not existing_has_email then
      raise exception using
        errcode = '23505',
        message = 'DUPLICATE_EMAIL_GOOGLE_ONLY';
    end if;

    raise exception using
      errcode = '23505',
      message = 'DUPLICATE_EMAIL_ACCOUNT_EXISTS';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_auth_user_email on auth.users;
create trigger prevent_duplicate_auth_user_email
before insert or update of email on auth.users
for each row
execute procedure public.prevent_duplicate_auth_user_email();

create or replace function public.prevent_duplicate_public_user_email()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_email text;
begin
  normalized_email := nullif(lower(trim(new.email)), '');

  if normalized_email is null then
    return new;
  end if;

  new.email := normalized_email;

  if exists (
    select 1
    from public.users u
    where u.id <> new.id
      and lower(trim(u.email)) = normalized_email
      and u.deleted_at is null
  ) then
    raise exception using
      errcode = '23505',
      message = 'DUPLICATE_EMAIL_ACCOUNT_EXISTS';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_public_user_email on public.users;
create trigger prevent_duplicate_public_user_email
before insert or update of email on public.users
for each row
execute procedure public.prevent_duplicate_public_user_email();
