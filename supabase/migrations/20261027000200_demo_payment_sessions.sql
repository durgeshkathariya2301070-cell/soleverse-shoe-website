-- Server-validated demo payment sessions. No external payment provider is contacted.
-- Apply after 20261027000100_demo_payment_methods.sql.
create table if not exists public.demo_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  session_key uuid not null,
  order_idempotency_key uuid not null,
  session_reference text not null unique check (session_reference ~ '^DP-[A-Z0-9]{12}$'),
  order_reference text not null check (order_reference ~ '^SV-[A-Z0-9]{8}$'),
  demo_method text not null check (demo_method in ('demo_upi', 'demo_card')),
  amount_inr integer not null check (amount_inr > 0),
  items_snapshot jsonb,
  shipping_snapshot jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'failed', 'expired', 'cancelled', 'completed')),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  transaction_reference text unique,
  transaction_at timestamptz,
  order_id uuid references public.orders (id) on delete set null,
  constraint demo_payment_session_expiry_check check (expires_at > created_at),
  constraint demo_payment_session_key_unique unique (user_id, session_key)
);

create index if not exists demo_payment_sessions_order_attempt_idx
  on public.demo_payment_sessions (user_id, order_idempotency_key, created_at desc);
create index if not exists demo_payment_sessions_order_id_idx
  on public.demo_payment_sessions (order_id);

alter table public.demo_payment_sessions enable row level security;
alter table public.demo_payment_sessions
  add column if not exists items_snapshot jsonb,
  add column if not exists shipping_snapshot jsonb;
revoke all on table public.demo_payment_sessions from public, anon, authenticated;
grant select on table public.demo_payment_sessions to authenticated;

drop policy if exists "Customers read their own demo payment sessions" on public.demo_payment_sessions;
create policy "Customers read their own demo payment sessions"
  on public.demo_payment_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

-- Prevent bypassing the demo session by calling the existing order RPC directly for an
-- online order. The confirmation RPC sets this transaction-local session marker.
create or replace function public.require_demo_payment_session_for_online_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
begin
  if new.payment_method <> 'simulated_online' then
    return new;
  end if;

  begin
    session_id := nullif(current_setting('soleverse.demo_payment_session', true), '')::uuid;
  exception when invalid_text_representation then
    session_id := null;
  end;

  if session_id is null or not exists (
    select 1
      from public.demo_payment_sessions s
     where s.id = session_id
       and s.user_id = auth.uid()
       and s.order_idempotency_key = new.idempotency_key
       and s.demo_method in ('demo_upi', 'demo_card')
       and s.status = 'pending'
       and s.expires_at > clock_timestamp()
  ) then
    raise exception 'demo_payment_session_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_require_demo_payment_session on public.orders;
create trigger orders_require_demo_payment_session
  before insert on public.orders
  for each row execute function public.require_demo_payment_session_for_online_order();

revoke all on function public.require_demo_payment_session_for_online_order() from public, anon, authenticated;

-- No caller can use the earlier compatibility wrapper to create an online order without the
-- validated session-confirmation flow below.
revoke all on function public.place_demo_order(uuid, jsonb, jsonb, text) from public, anon, authenticated;

drop function if exists public.create_demo_payment_session(uuid, uuid, jsonb, text);
create or replace function public.create_demo_payment_session(
  p_session_key uuid,
  p_order_idempotency_key uuid,
  p_items jsonb,
  p_shipping jsonb,
  p_demo_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing public.demo_payment_sessions%rowtype;
  quote jsonb;
  new_session_reference text;
  new_order_reference text;
  attempt integer := 0;
  created timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_session_key is null or p_order_idempotency_key is null
     or p_items is null or p_shipping is null
     or p_demo_method not in ('demo_upi', 'demo_card') then
    raise exception 'invalid_demo_payment_session' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('demo_order:' || uid::text || ':' || p_order_idempotency_key::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('demo_session:' || uid::text || ':' || p_session_key::text, 0));

  select * into existing
    from public.demo_payment_sessions
   where user_id = uid and session_key = p_session_key;
  if found then
    if existing.order_idempotency_key <> p_order_idempotency_key or existing.demo_method <> p_demo_method then
      raise exception 'demo_payment_session_mismatch' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'id', existing.id, 'session_reference', existing.session_reference,
      'order_reference', existing.order_reference, 'demo_method', existing.demo_method,
      'amount_inr', existing.amount_inr, 'status', existing.status,
      'created_at', existing.created_at, 'expires_at', existing.expires_at,
      'transaction_reference', existing.transaction_reference, 'transaction_at', existing.transaction_at,
      'order_id', existing.order_id, 'server_now', clock_timestamp()
    );
  end if;

  if exists (
    select 1 from public.orders
     where user_id = uid and idempotency_key = p_order_idempotency_key
  ) then
    raise exception 'demo_order_already_placed' using errcode = 'P0001';
  end if;

  update public.demo_payment_sessions
     set status = 'expired',
         transaction_reference = 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
         transaction_at = clock_timestamp()
   where user_id = uid
     and order_idempotency_key = p_order_idempotency_key
     and status = 'pending'
     and expires_at <= clock_timestamp();
  if exists (
    select 1 from public.demo_payment_sessions
     where user_id = uid
       and order_idempotency_key = p_order_idempotency_key
       and status = 'pending'
  ) then
    raise exception 'demo_payment_session_already_pending' using errcode = 'P0001';
  end if;

  quote := public.quote_order(p_items);
  if coalesce((quote ->> 'ok')::boolean, false) is not true then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;
  if coalesce((quote ->> 'total_inr')::integer, 0) <= 0 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  loop
    attempt := attempt + 1;
    new_session_reference := 'DP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    new_order_reference := 'SV-' || upper(substr(md5(random()::text || clock_timestamp()::text || uid::text), 1, 8));
    exit when attempt >= 5 or (
      not exists (select 1 from public.demo_payment_sessions where session_reference = new_session_reference)
      and not exists (select 1 from public.orders where reference = new_order_reference)
      and not exists (select 1 from public.demo_payment_sessions where order_reference = new_order_reference)
    );
  end loop;
  if exists (select 1 from public.demo_payment_sessions where session_reference = new_session_reference)
     or exists (select 1 from public.orders where reference = new_order_reference)
     or exists (select 1 from public.demo_payment_sessions where order_reference = new_order_reference) then
    raise exception 'demo_reference_generation_failed' using errcode = 'P0001';
  end if;

  created := clock_timestamp();
  insert into public.demo_payment_sessions (
    user_id, session_key, order_idempotency_key, session_reference, order_reference,
    demo_method, amount_inr, items_snapshot, shipping_snapshot, status, created_at, expires_at
  ) values (
    uid, p_session_key, p_order_idempotency_key, new_session_reference, new_order_reference,
    p_demo_method, (quote ->> 'total_inr')::integer, p_items, p_shipping,
    'pending', created, created + interval '3 minutes'
  ) returning * into existing;

  return jsonb_build_object(
    'id', existing.id, 'session_reference', existing.session_reference,
    'order_reference', existing.order_reference, 'demo_method', existing.demo_method,
    'amount_inr', existing.amount_inr, 'status', existing.status,
    'created_at', existing.created_at, 'expires_at', existing.expires_at,
    'transaction_reference', existing.transaction_reference, 'transaction_at', existing.transaction_at,
    'order_id', existing.order_id, 'server_now', clock_timestamp()
  );
end;
$$;

drop function if exists public.finish_demo_payment_session(uuid, text, jsonb, jsonb);
create or replace function public.finish_demo_payment_session(
  p_session_id uuid,
  p_result text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  session public.demo_payment_sessions%rowtype;
  quote jsonb;
  placed jsonb;
  transaction_id text;
  transaction_time timestamptz;
  next_status text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_result is null or p_result not in ('success', 'failure', 'cancel') then
    raise exception 'invalid_demo_payment_result' using errcode = 'P0001';
  end if;

  select * into session
    from public.demo_payment_sessions
   where id = p_session_id and user_id = uid
   for update;
  if not found then
    raise exception 'demo_payment_session_not_found' using errcode = 'P0001';
  end if;

  if session.status = 'completed' then
    return jsonb_build_object(
      'status', session.status, 'order_id', session.order_id, 'order_reference', session.order_reference,
      'session_reference', session.session_reference, 'transaction_reference', session.transaction_reference,
      'transaction_at', session.transaction_at, 'amount_inr', session.amount_inr,
      'demo_method', session.demo_method, 'reused', true, 'server_now', clock_timestamp()
    );
  end if;
  if session.status <> 'pending' then
    return jsonb_build_object(
      'status', session.status, 'session_reference', session.session_reference,
      'transaction_reference', session.transaction_reference, 'transaction_at', session.transaction_at,
      'amount_inr', session.amount_inr, 'demo_method', session.demo_method, 'reused', false,
      'server_now', clock_timestamp()
    );
  end if;
  if session.expires_at <= clock_timestamp() then
    transaction_id := 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    transaction_time := clock_timestamp();
    update public.demo_payment_sessions
       set status = 'expired', transaction_reference = transaction_id, transaction_at = transaction_time
     where id = session.id;
    return jsonb_build_object(
      'status', 'expired', 'session_reference', session.session_reference,
      'transaction_reference', transaction_id, 'transaction_at', transaction_time,
      'amount_inr', session.amount_inr, 'demo_method', session.demo_method, 'reused', false,
      'server_now', clock_timestamp()
    );
  end if;

  if p_result = 'cancel' then
    transaction_id := 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    transaction_time := clock_timestamp();
    update public.demo_payment_sessions
       set status = 'cancelled', transaction_reference = transaction_id, transaction_at = transaction_time
     where id = session.id;
    return jsonb_build_object(
      'status', 'cancelled', 'session_reference', session.session_reference,
      'transaction_reference', transaction_id, 'transaction_at', transaction_time,
      'amount_inr', session.amount_inr, 'demo_method', session.demo_method, 'reused', false,
      'server_now', clock_timestamp()
    );
  end if;

  if p_result = 'failure' then
    transaction_id := 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    transaction_time := clock_timestamp();
    update public.demo_payment_sessions
       set status = 'failed', transaction_reference = transaction_id, transaction_at = transaction_time
     where id = session.id;
    return jsonb_build_object(
      'status', 'failed', 'session_reference', session.session_reference,
      'transaction_reference', transaction_id, 'transaction_at', transaction_time,
      'amount_inr', session.amount_inr, 'demo_method', session.demo_method, 'reused', false,
      'server_now', clock_timestamp()
    );
  end if;

  if session.items_snapshot is null or session.shipping_snapshot is null then
    raise exception 'demo_payment_session_snapshot_unavailable' using errcode = 'P0001';
  end if;
  quote := public.quote_order(session.items_snapshot);
  if coalesce((quote ->> 'ok')::boolean, false) is not true
     or (quote ->> 'total_inr')::integer <> session.amount_inr then
    raise exception 'demo_payment_amount_or_stock_changed' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('demo_order:' || uid::text || ':' || session.order_idempotency_key::text, 0));
  if exists (
    select 1 from public.orders
     where user_id = uid and idempotency_key = session.order_idempotency_key
  ) then
    select * into session
      from public.demo_payment_sessions
     where id = p_session_id and user_id = uid
     for update;
    if session.status = 'completed' then
      return jsonb_build_object(
        'status', session.status, 'order_id', session.order_id, 'order_reference', session.order_reference,
        'session_reference', session.session_reference, 'transaction_reference', session.transaction_reference,
        'transaction_at', session.transaction_at, 'amount_inr', session.amount_inr,
        'demo_method', session.demo_method, 'reused', true, 'server_now', clock_timestamp()
      );
    end if;
    raise exception 'demo_order_already_placed' using errcode = 'P0001';
  end if;

  perform set_config('soleverse.demo_payment_session', session.id::text, true);
  placed := public.place_order(
    session.order_idempotency_key, session.items_snapshot, session.shipping_snapshot, 'simulated_online'
  );
  if (placed ->> 'total_inr')::integer <> session.amount_inr then
    raise exception 'demo_payment_amount_changed' using errcode = 'P0001';
  end if;

  update public.orders
     set reference = session.order_reference,
         demo_payment_method = session.demo_method
   where id = (placed ->> 'order_id')::uuid and user_id = uid;

  transaction_id := 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  transaction_time := clock_timestamp();
  update public.demo_payment_sessions
     set status = 'completed',
         order_id = (placed ->> 'order_id')::uuid,
         transaction_reference = transaction_id,
         transaction_at = transaction_time
   where id = session.id;

  return jsonb_build_object(
    'status', 'completed', 'order_id', placed ->> 'order_id',
    'order_reference', session.order_reference, 'session_reference', session.session_reference,
    'transaction_reference', transaction_id, 'transaction_at', transaction_time,
    'amount_inr', session.amount_inr, 'demo_method', session.demo_method,
    'reused', false, 'server_now', clock_timestamp()
  );
end;
$$;

create or replace function public.soleverse_admin_demo_payment_receipt(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  receipt jsonb;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'demo_method', s.demo_method, 'status', s.status, 'amount_inr', s.amount_inr,
    'session_reference', s.session_reference, 'transaction_reference', s.transaction_reference,
    'transaction_at', s.transaction_at
  ) into receipt
    from public.demo_payment_sessions s
   where s.order_id = p_order_id and s.status = 'completed'
   order by s.transaction_at desc
   limit 1;
  return receipt;
end;
$$;

revoke all on function public.create_demo_payment_session(uuid, uuid, jsonb, jsonb, text) from public, anon;
revoke all on function public.finish_demo_payment_session(uuid, text) from public, anon;
revoke all on function public.soleverse_admin_demo_payment_receipt(uuid) from public, anon;
grant execute on function public.create_demo_payment_session(uuid, uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.finish_demo_payment_session(uuid, text) to authenticated;
grant execute on function public.soleverse_admin_demo_payment_receipt(uuid) to authenticated;
