-- =====================================================================================
-- SOLEVERSE Phase 6, file 2 of 3: the saved bag (cart) for logged-in customers
--
-- HOW TO RUN: SQL Editor -> New query -> paste this whole file -> Run (after file 1). Safe to re-run.
--
-- A logged-in customer's bag is saved here so it follows them to another phone or computer.
-- Each person can only ever see and change THEIR OWN rows (Row Level Security).
-- =====================================================================================

create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id text not null,
  color_id   text not null,
  size       integer not null,
  quantity   integer not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the same shoe + colour + size is ONE line with a quantity, never two lines
  unique (user_id, product_id, color_id, size),
  -- only real catalogue variants can be in a bag
  foreign key (product_id, color_id, size)
    references public.product_variants (product_id, color_id, size) on delete cascade
);

create index if not exists cart_items_user_id_idx on public.cart_items (user_id);

alter table public.cart_items enable row level security;

revoke all on table public.cart_items from anon, authenticated;
grant select, insert, update, delete on table public.cart_items to authenticated;

drop policy if exists "Users can read their own bag" on public.cart_items;
create policy "Users can read their own bag"
  on public.cart_items for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add to their own bag" on public.cart_items;
create policy "Users can add to their own bag"
  on public.cart_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can change their own bag" on public.cart_items;
create policy "Users can change their own bag"
  on public.cart_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can empty their own bag" on public.cart_items;
create policy "Users can empty their own bag"
  on public.cart_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Same helper as the profiles file (re-created here so this file works on its own).
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

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------------------
-- normalize_cart_items: turns the browser's list of lines into a clean, checked list.
--   * the browser sends ONLY product_id, color_id, size, quantity (never a price)
--   * identical lines are merged; a line's quantity is capped at 10; at most 20 lines
--   * anything malformed raises an error instead of being guessed at
-- Used by replace_cart (below) and by the order functions (next file).
-- -------------------------------------------------------------------------------------
create or replace function public.normalize_cart_items(p_items jsonb)
returns table (product_id text, color_id text, size integer, quantity integer)
language plpgsql
stable
set search_path = ''
as $$
declare
  line_count integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  -- every element must be an object with the four fields in the right shape
  if exists (
    select 1 from jsonb_array_elements(p_items) as e
    where jsonb_typeof(e) <> 'object'
       or jsonb_typeof(e -> 'product_id') is distinct from 'string'
       or jsonb_typeof(e -> 'color_id') is distinct from 'string'
       or jsonb_typeof(e -> 'size') is distinct from 'number'
       or jsonb_typeof(e -> 'quantity') is distinct from 'number'
       or (e ->> 'size') !~ '^[0-9]{1,2}$'
       or (e ->> 'quantity') !~ '^[0-9]{1,3}$'
       or (e ->> 'quantity')::integer < 1
  ) then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  select count(*) into line_count from (
    select 1 from jsonb_array_elements(p_items) as e
    group by e ->> 'product_id', e ->> 'color_id', (e ->> 'size')::integer
  ) as g;
  if line_count > 20 then
    raise exception 'too_many_lines' using errcode = 'P0001';
  end if;

  return query
    select e ->> 'product_id',
           e ->> 'color_id',
           (e ->> 'size')::integer,
           least(sum((e ->> 'quantity')::integer), 10)::integer
    from jsonb_array_elements(p_items) as e
    group by e ->> 'product_id', e ->> 'color_id', (e ->> 'size')::integer
    order by 1, 2, 3;
end;
$$;

-- -------------------------------------------------------------------------------------
-- replace_cart: saves the whole bag in one step (all or nothing). It runs as the logged-in
-- user, so Row Level Security still applies: it can only ever touch that user's own rows.
-- Lines that are not real, active catalogue variants are quietly dropped.
-- An empty list empties the bag.
-- -------------------------------------------------------------------------------------
create or replace function public.replace_cart(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  -- One save at a time per person, so two tabs cannot interleave the delete and the insert.
  perform pg_advisory_xact_lock(hashtextextended('replace_cart:' || uid::text, 0));

  delete from public.cart_items where user_id = uid;

  if jsonb_array_length(p_items) > 0 then
    insert into public.cart_items (user_id, product_id, color_id, size, quantity)
    select uid, n.product_id, n.color_id, n.size, n.quantity
    from public.normalize_cart_items(p_items) as n
    join public.product_variants v
      on v.product_id = n.product_id and v.color_id = n.color_id and v.size = n.size
    join public.products p on p.id = v.product_id and p.is_active;
  end if;
end;
$$;

revoke all on function public.normalize_cart_items(jsonb) from public, anon;
revoke all on function public.replace_cart(jsonb) from public, anon;
grant execute on function public.normalize_cart_items(jsonb) to authenticated;
grant execute on function public.replace_cart(jsonb) to authenticated;
