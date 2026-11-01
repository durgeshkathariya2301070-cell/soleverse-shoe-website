-- SOLEVERSE admin user management.
-- Apply after 20261019000000_phase7_admin.sql.
-- All user-directory access and allow-list changes happen through admin-checked RPCs.

create or replace function public.soleverse_admin_list_users()
returns table (user_id uuid, email text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select a.user_id, u.email::text, a.created_at
    from public.soleverse_admins a
    join auth.users u on u.id = a.user_id
    order by lower(u.email), a.user_id;
end;
$$;

create or replace function public.soleverse_admin_search_users(p_email text)
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  search_email text := lower(btrim(coalesce(p_email, '')));
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if char_length(search_email) < 3 or char_length(search_email) > 254 then
    raise exception 'invalid_email_search' using errcode = '22023';
  end if;

  return query
    select u.id, u.email::text
    from auth.users u
    where u.email is not null
      and left(lower(u.email), char_length(search_email)) = search_email
      and not exists (
        select 1 from public.soleverse_admins a where a.user_id = u.id
      )
    order by lower(u.email), u.id
    limit 10;
end;
$$;

create or replace function public.soleverse_admin_grant_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'invalid_target_user' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'target_user_not_found' using errcode = 'P0002';
  end if;

  lock table public.soleverse_admins in exclusive mode;
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  insert into public.soleverse_admins (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.soleverse_admin_revoke_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count bigint;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'invalid_target_user' using errcode = '22023';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_revoke_own_admin_access' using errcode = 'P0001';
  end if;

  lock table public.soleverse_admins in exclusive mode;
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.soleverse_admins a where a.user_id = p_user_id
  ) then
    raise exception 'target_is_not_an_admin' using errcode = 'P0002';
  end if;

  select count(*) into admin_count from public.soleverse_admins;
  if admin_count <= 1 then
    raise exception 'cannot_remove_last_admin' using errcode = 'P0001';
  end if;

  delete from public.soleverse_admins where user_id = p_user_id;
end;
$$;

revoke all on function public.soleverse_admin_list_users() from public, anon;
revoke all on function public.soleverse_admin_search_users(text) from public, anon;
revoke all on function public.soleverse_admin_grant_access(uuid) from public, anon;
revoke all on function public.soleverse_admin_revoke_access(uuid) from public, anon;
grant execute on function public.soleverse_admin_list_users() to authenticated;
grant execute on function public.soleverse_admin_search_users(text) to authenticated;
grant execute on function public.soleverse_admin_grant_access(uuid) to authenticated;
grant execute on function public.soleverse_admin_revoke_access(uuid) to authenticated;
