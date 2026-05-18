create or replace function public.password_reset_email_exists(target_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from auth.users
    where lower(trim(email)) = lower(trim(target_email))
      and deleted_at is null
  );
$$;

revoke all on function public.password_reset_email_exists(text) from public;
grant execute on function public.password_reset_email_exists(text) to anon;
grant execute on function public.password_reset_email_exists(text) to authenticated;
