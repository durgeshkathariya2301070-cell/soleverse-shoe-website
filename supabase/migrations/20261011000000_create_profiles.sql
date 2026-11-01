-- =====================================================================================
-- SOLEVERSE Phase 5: user profiles
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- It is safe to run more than once (it will not duplicate or overwrite anything).
--
-- Passwords are NOT stored here. Supabase Auth keeps them (hashed) in its own private
-- "auth" schema. This table only holds the extra, non-secret details about a person.
-- =====================================================================================

-- 1. The table: one row per user. `id` is the same id Supabase Auth gave the user.
--    "on delete cascade" removes the profile automatically if the auth user is deleted.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Row Level Security: with this ON, nobody can touch a row unless a policy below allows it.
alter table public.profiles enable row level security;

-- The website's logged-out visitors ("anon") get nothing. Logged-in users ("authenticated") may
-- read, create and edit rows (the policies below narrow that down to their OWN row).
-- There is no delete permission: profiles disappear only when the auth user is deleted.
revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 3. Keep `updated_at` correct automatically whenever a row is edited.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. Create the profile row automatically when someone signs up.
--    The sign-up form sends the full name as user metadata; this copies it into the table.
--    SECURITY DEFINER lets the function write the row even though the new user has no session yet.
--    "set search_path = ''" and fully-written names (public.profiles) keep it safe.
--    "on conflict do nothing" means a profile that already exists is never duplicated or overwritten.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. One-time catch-up: give a profile to anyone who signed up BEFORE this file was run.
insert into public.profiles (id, full_name)
select u.id, nullif(left(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), 100), '')
from auth.users as u
on conflict (id) do nothing;
