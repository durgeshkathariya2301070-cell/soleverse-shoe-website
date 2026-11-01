-- =====================================================================================
-- SOLEVERSE Phase 6, file 3 of 3: orders, and the ONLY way an order can be created
--
-- HOW TO RUN: SQL Editor -> New query -> paste this whole file -> Run (after files 1 and 2).
-- Safe to run more than once.
--
-- THE SAFETY MODEL, in plain words
--   * The website can READ the customer's own orders, but it can never INSERT or CHANGE them.
--   * Orders are created only by the function place_order(). It runs with the database's own
--     authority, but it first checks who is logged in, takes prices from the `products` table
--     (never from the browser), checks stock, and does everything in ONE transaction:
--     either the whole order is saved and stock is reduced, or nothing happens.
--   * Pressing "Place order" twice cannot create two orders: each attempt carries a one-time
--     idempotency key, and the same key always returns the same order.
--   * PAYMENT IS SIMULATED. Nothing here talks to a bank or payment gateway. "cod" means pay on
--     delivery; "simulated_online" is a demonstration only and no money is ever charged.
-- =====================================================================================

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique check (reference ~ '^SV-[A-Z0-9]{8}$'),
  user_id         uuid not null references auth.users (id) on delete restrict,
  idempotency_key uuid not null,
  status          text not null default 'placed' check (status in ('placed', 'cancelled')),
  payment_method  text not null check (payment_method in ('cod', 'simulated_online')),
  payment_status  text not null check (payment_status in ('due_on_delivery', 'simulated')),
  subtotal_inr    integer not null check (subtotal_inr > 0),
  delivery_fee_inr integer not null check (delivery_fee_inr >= 0),
  total_inr       integer not null check (total_inr > 0),
  ship_full_name  text not null check (char_length(ship_full_name) between 2 and 80),
  ship_phone      text not null check (ship_phone ~ '^[6-9][0-9]{9}$'),
  ship_pin_code   text not null check (ship_pin_code ~ '^[1-9][0-9]{5}$'),
  ship_state      text not null check (char_length(ship_state) between 2 and 40),
  ship_city       text not null check (char_length(ship_city) between 2 and 60),
  ship_street     text not null check (char_length(ship_street) between 5 and 200),
  ship_landmark   text check (ship_landmark is null or char_length(ship_landmark) between 1 and 100),
  created_at      timestamptz not null default now(),
  -- the same customer + the same attempt key can only ever be ONE order
  unique (user_id, idempotency_key),
  -- the money must add up, and each payment method has exactly one matching status
  check (total_inr = subtotal_inr + delivery_fee_inr),
  check (
    (payment_method = 'cod' and payment_status = 'due_on_delivery')
    or (payment_method = 'simulated_online' and payment_status = 'simulated')
  )
);

create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  product_id     text not null references public.products (id) on delete restrict,
  product_name   text not null,   -- copied at order time, so later renames do not rewrite history
  color_id       text not null,
  color_label    text not null,
  size           integer not null check (size between 1 and 20),
  unit_price_inr integer not null check (unit_price_inr > 0),
  quantity       integer not null check (quantity between 1 and 10),
  line_total_inr integer not null check (line_total_inr = unit_price_inr * quantity),
  unique (order_id, product_id, color_id, size)
);

create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Customers may only READ their own orders. No insert / update / delete is granted at all.
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;

drop policy if exists "Users can read their own orders" on public.orders;
create policy "Users can read their own orders"
  on public.orders for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read items of their own orders" on public.order_items;
create policy "Users can read items of their own orders"
  on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())
  ));

-- The delivery fee lives here, not in the browser. Change it in one place if it ever changes.
create or replace function public.delivery_fee_inr()
returns integer
language sql
immutable
set search_path = ''
as $$ select 99 $$;

-- -------------------------------------------------------------------------------------
-- quote_order: "what would this bag cost right now?" Read-only. The checkout page calls it so the
-- customer sees the REAL prices and stock. It runs as the customer and never changes anything.
-- -------------------------------------------------------------------------------------
create or replace function public.quote_order(p_items jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result_lines jsonb;
  sub integer;
  fee integer := public.delivery_fee_inr();
  all_ok boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  with lines as (
    select n.product_id, n.color_id, n.size, n.quantity,
           p.name, p.price_inr, v.color_label, v.stock,
           case
             when p.id is null or v.product_id is null then 'unavailable'
             when v.stock < n.quantity then 'insufficient_stock'
             else 'ok'
           end as line_status
    from public.normalize_cart_items(p_items) as n
    left join public.products p on p.id = n.product_id and p.is_active
    left join public.product_variants v
      on v.product_id = n.product_id and v.color_id = n.color_id and v.size = n.size and p.id is not null
  )
  select
    jsonb_agg(jsonb_build_object(
      'product_id', product_id, 'color_id', color_id, 'size', size, 'quantity', quantity,
      'name', name, 'color_label', color_label,
      'unit_price_inr', price_inr, 'line_total_inr', price_inr * quantity,
      'stock', coalesce(stock, 0), 'status', line_status
    ) order by product_id, color_id, size),
    coalesce(sum(price_inr * quantity) filter (where line_status = 'ok'), 0),
    bool_and(line_status = 'ok')
  into result_lines, sub, all_ok
  from lines;

  return jsonb_build_object(
    'lines', coalesce(result_lines, '[]'::jsonb),
    'subtotal_inr', sub,
    'delivery_fee_inr', fee,
    'total_inr', sub + fee,
    'ok', coalesce(all_ok, false)
  );
end;
$$;

-- -------------------------------------------------------------------------------------
-- place_order: the only way to create an order.
--   p_idempotency_key  one-time id for this checkout attempt (the browser makes it)
--   p_items            [{product_id, color_id, size, quantity}]  (NO prices)
--   p_shipping         {full_name, phone, pin_code, state, city, street, landmark}
--   p_payment_method   'cod' or 'simulated_online' (simulated: no money is charged)
-- Returns {order_id, reference, total_inr, reused}.  reused = true when this attempt had already
-- been saved and we simply returned the existing order instead of creating a second one.
-- -------------------------------------------------------------------------------------
create or replace function public.place_order(
  p_idempotency_key uuid,
  p_items jsonb,
  p_shipping jsonb,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing public.orders%rowtype;
  states constant text[] := array[
    'Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh',
    'Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana',
    'Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep',
    'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry',
    'Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
    'West Bengal'
  ];
  s_name text;
  s_phone text;
  s_pin text;
  s_state text;
  s_city text;
  s_street text;
  s_landmark text;
  line record;
  v record;
  sub integer := 0;
  fee integer := public.delivery_fee_inr();
  pay_status text;
  new_order_id uuid;
  new_reference text;
  attempt integer := 0;
  collected jsonb := '[]'::jsonb;  -- the checked lines, gathered as we lock them
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_idempotency_key is null then
    raise exception 'invalid_request' using errcode = 'P0001';
  end if;
  if p_payment_method is null or p_payment_method not in ('cod', 'simulated_online') then
    raise exception 'invalid_payment_method' using errcode = 'P0001';
  end if;
  pay_status := case p_payment_method when 'cod' then 'due_on_delivery' else 'simulated' end;

  -- Serialise attempts that share this key: a double click (or two tabs) waits here, then sees
  -- the order the first one created.
  perform pg_advisory_xact_lock(hashtextextended('place_order:' || uid::text || ':' || p_idempotency_key::text, 0));

  select * into existing from public.orders where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', existing.id, 'reference', existing.reference,
                              'total_inr', existing.total_inr, 'reused', true);
  end if;

  -- ---- shipping details: trimmed, then checked again here (never trust the browser) ----
  if p_shipping is null or jsonb_typeof(p_shipping) <> 'object' then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'shipping';
  end if;
  s_name     := btrim(regexp_replace(coalesce(p_shipping ->> 'full_name', ''), '\s+', ' ', 'g'));
  s_phone    := regexp_replace(coalesce(p_shipping ->> 'phone', ''), '[\s-]', '', 'g');
  s_pin      := btrim(coalesce(p_shipping ->> 'pin_code', ''));
  s_state    := btrim(coalesce(p_shipping ->> 'state', ''));
  s_city     := btrim(regexp_replace(coalesce(p_shipping ->> 'city', ''), '\s+', ' ', 'g'));
  s_street   := btrim(regexp_replace(coalesce(p_shipping ->> 'street', ''), '\s+', ' ', 'g'));
  s_landmark := nullif(btrim(regexp_replace(coalesce(p_shipping ->> 'landmark', ''), '\s+', ' ', 'g')), '');

  if char_length(s_name) not between 2 and 80 then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'full_name';
  end if;
  if s_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'phone';
  end if;
  if s_pin !~ '^[1-9][0-9]{5}$' then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'pin_code';
  end if;
  if not (s_state = any (states)) then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'state';
  end if;
  if char_length(s_city) not between 2 and 60 then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'city';
  end if;
  if char_length(s_street) not between 5 and 200 then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'street';
  end if;
  if s_landmark is not null and char_length(s_landmark) > 100 then
    raise exception 'invalid_shipping' using errcode = 'P0001', detail = 'landmark';
  end if;

  -- ---- check every line against the REAL catalogue, locking the stock rows as we go ----
  -- normalize_cart_items returns lines sorted by (product, colour, size), so every order locks
  -- rows in the same order and two orders can never deadlock each other.
  for line in select * from public.normalize_cart_items(p_items) loop
    select p.name as name, p.price_inr as price, p.is_active as active,
           pv.color_label as color_label, pv.stock as stock
      into v
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
     where pv.product_id = line.product_id and pv.color_id = line.color_id and pv.size = line.size
       for update of pv;

    if not found or not v.active then
      raise exception 'item_unavailable' using errcode = 'P0001', detail = line.product_id;
    end if;
    if v.stock < line.quantity then
      raise exception 'insufficient_stock' using errcode = 'P0001', detail = line.product_id;
    end if;

    collected := collected || jsonb_build_object(
      'product_id', line.product_id, 'color_id', line.color_id, 'color_label', v.color_label,
      'size', line.size, 'quantity', line.quantity, 'product_name', v.name, 'unit_price', v.price);
    sub := sub + v.price * line.quantity;
  end loop;

  -- ---- save the order (retrying on the very unlikely chance two references collide) ----
  loop
    attempt := attempt + 1;
    new_reference := 'SV-' || upper(substr(md5(random()::text || clock_timestamp()::text || uid::text), 1, 8));
    begin
      insert into public.orders (
        reference, user_id, idempotency_key, payment_method, payment_status,
        subtotal_inr, delivery_fee_inr, total_inr,
        ship_full_name, ship_phone, ship_pin_code, ship_state, ship_city, ship_street, ship_landmark
      ) values (
        new_reference, uid, p_idempotency_key, p_payment_method, pay_status,
        sub, fee, sub + fee,
        s_name, s_phone, s_pin, s_state, s_city, s_street, s_landmark
      ) returning id into new_order_id;
      exit;
    exception when unique_violation then
      -- Could be a clashing reference (retry) or the same key (should be impossible: we hold the lock).
      if attempt >= 5 then raise; end if;
    end;
  end loop;

  insert into public.order_items (order_id, product_id, product_name, color_id, color_label, size, unit_price_inr, quantity, line_total_inr)
  select new_order_id, t.product_id, t.product_name, t.color_id, t.color_label, t.size, t.unit_price, t.quantity, t.unit_price * t.quantity
  from jsonb_to_recordset(collected) as t(product_id text, color_id text, color_label text, size integer,
                                          quantity integer, product_name text, unit_price integer);

  -- take the pairs out of stock
  update public.product_variants pv
     set stock = pv.stock - t.quantity
    from jsonb_to_recordset(collected) as t(product_id text, color_id text, color_label text, size integer,
                                            quantity integer, product_name text, unit_price integer)
   where pv.product_id = t.product_id and pv.color_id = t.color_id and pv.size = t.size;

  -- the ordered lines leave the saved bag
  delete from public.cart_items c
   using jsonb_to_recordset(collected) as t(product_id text, color_id text, color_label text, size integer,
                                            quantity integer, product_name text, unit_price integer)
   where c.user_id = uid and c.product_id = t.product_id and c.color_id = t.color_id and c.size = t.size;

  return jsonb_build_object('order_id', new_order_id, 'reference', new_reference,
                            'total_inr', sub + fee, 'reused', false);
end;
$$;

-- Only logged-in customers may call these. Logged-out visitors ("anon") may not.
revoke all on function public.delivery_fee_inr() from public, anon;
revoke all on function public.quote_order(jsonb) from public, anon;
revoke all on function public.place_order(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.delivery_fee_inr() to authenticated;
grant execute on function public.quote_order(jsonb) to authenticated;
grant execute on function public.place_order(uuid, jsonb, jsonb, text) to authenticated;
