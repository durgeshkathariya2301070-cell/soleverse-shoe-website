-- !!! FOR A THROWAWAY LOCAL DATABASE ONLY. NEVER RUN THIS IN YOUR REAL SUPABASE PROJECT. !!!
-- Supabase already has these roles and the auth schema. This file imitates just enough of them
-- (roles anon / authenticated, auth.users, auth.uid()) so the real migrations can be tested on a
-- plain PostgreSQL server. See supabase/local-test/README.md.
-- (roles belong to the whole server, not one database, so create them only if missing)
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb
);
-- Supabase's auth.uid() reads the logged-in user's id from the request's token claims.
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
