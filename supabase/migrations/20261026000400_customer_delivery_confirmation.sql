-- Customers, rather than administrators, confirm receipt before an order is Delivered.
alter table public.orders
  add column if not exists delivered_at timestamptz;

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'));

create table if not exists public.order_delivery_confirmations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  customer_id uuid not null references auth.users (id) on delete restrict,
  attempt integer not null check (attempt > 0),
  created_at timestamptz not null default now(),
  response boolean,
  responded_at timestamptz,
  issue_report text,
  issue_reported_at timestamptz,
  unique (order_id, attempt)
);

create index if not exists order_delivery_confirmations_customer_pending_idx
  on public.order_delivery_confirmations (customer_id, created_at desc)
  where response is null;

alter table public.order_delivery_confirmations enable row level security;
revoke all on table public.order_delivery_confirmations from public, anon, authenticated;
grant select on table public.order_delivery_confirmations to authenticated;

drop policy if exists "Customers read their own delivery confirmations" on public.order_delivery_confirmations;
create policy "Customers read their own delivery confirmations"
  on public.order_delivery_confirmations for select to authenticated
  using ((select auth.uid()) = customer_id);

create or replace function public.soleverse_admin_update_order_status(p_order_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  latest_response boolean;
  next_attempt integer;
  line record;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('processing', 'shipped', 'out_for_delivery', 'cancelled') then
    raise exception 'invalid_order_status' using errcode = '22023';
  end if;

  select status into current_status
    from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if current_status = p_status then return current_status; end if;

  if current_status = 'out_for_delivery' and p_status = 'shipped' then
    select response into latest_response
      from public.order_delivery_confirmations
      where order_id = p_order_id
      order by attempt desc
      limit 1;
  end if;

  if not (
    (current_status = 'placed' and p_status in ('processing', 'cancelled'))
    or (current_status = 'processing' and p_status in ('shipped', 'cancelled'))
    or (current_status = 'shipped' and p_status = 'out_for_delivery')
    or (current_status = 'out_for_delivery' and p_status = 'shipped' and latest_response is false)
  ) then
    raise exception 'invalid_order_status_transition' using errcode = '22023';
  end if;

  update public.orders set status = p_status where id = p_order_id;

  if p_status = 'out_for_delivery' then
    select coalesce(max(attempt), 0) + 1 into next_attempt
      from public.order_delivery_confirmations
      where order_id = p_order_id;
    insert into public.order_delivery_confirmations (order_id, customer_id, attempt)
      select id, user_id, next_attempt from public.orders where id = p_order_id;
  end if;

  if p_status = 'cancelled' then
    for line in
      select product_id, color_id, size, quantity
      from public.order_items
      where order_id = p_order_id
      order by product_id, color_id, size
    loop
      update public.product_variants
         set stock = stock + line.quantity
       where product_id = line.product_id and color_id = line.color_id and size = line.size;
    end loop;
  end if;
  return p_status;
end;
$$;

create or replace function public.soleverse_customer_delivery_notifications()
returns table (
  id uuid,
  order_id uuid,
  order_reference text,
  attempt integer,
  created_at timestamptz,
  response boolean,
  responded_at timestamptz,
  issue_report text,
  issue_reported_at timestamptz,
  order_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return query
    select c.id, c.order_id, o.reference, c.attempt, c.created_at,
           c.response, c.responded_at, c.issue_report, c.issue_reported_at, o.status
    from public.order_delivery_confirmations c
    join public.orders o on o.id = c.order_id
    where c.customer_id = auth.uid() and o.user_id = auth.uid()
    order by c.created_at desc, c.attempt desc;
end;
$$;

create or replace function public.soleverse_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_orders', (select count(*) from public.orders),
    'total_sales_inr', (select coalesce(sum(total_inr), 0) from public.orders where status in ('delivered', 'completed')),
    'pending_orders', (select count(*) from public.orders where status in ('placed', 'processing', 'shipped', 'out_for_delivery')),
    'completed_orders', (select count(*) from public.orders where status in ('delivered', 'completed')),
    'active_products', (select count(*) from public.products where is_active),
    'recent_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'reference', recent.reference,
        'created_at', recent.created_at,
        'customer_name', recent.ship_full_name,
        'total_inr', recent.total_inr,
        'status', recent.status
      ) order by recent.created_at desc)
      from (select id, reference, created_at, ship_full_name, total_inr, status
            from public.orders order by created_at desc limit 8) recent
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.soleverse_customer_respond_delivery(
  p_notification_id uuid,
  p_received boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_order record;
  current_response boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_received is null then
    raise exception 'invalid_delivery_response' using errcode = '22023';
  end if;

  select o.id, o.user_id, o.status into delivery_order
    from public.order_delivery_confirmations c
    join public.orders o on o.id = c.order_id
    where c.id = p_notification_id
      and c.customer_id = auth.uid()
      and o.user_id = auth.uid()
    for update of o;
  if not found then
    raise exception 'delivery_notification_not_found' using errcode = 'P0002';
  end if;
  select response into current_response
    from public.order_delivery_confirmations
    where id = p_notification_id and customer_id = auth.uid()
    for update;
  if current_response is not null then
    raise exception 'delivery_response_already_recorded' using errcode = '22023';
  end if;
  if delivery_order.status <> 'out_for_delivery' then
    raise exception 'delivery_confirmation_not_current' using errcode = '22023';
  end if;

  update public.order_delivery_confirmations
    set response = p_received, responded_at = now()
    where id = p_notification_id;

  if p_received then
    update public.orders
      set status = 'delivered', delivered_at = now()
      where id = delivery_order.id and status = 'out_for_delivery';
    if not found then
      raise exception 'delivery_confirmation_not_current' using errcode = '22023';
    end if;
    return 'delivered';
  end if;
  return 'out_for_delivery';
end;
$$;

create or replace function public.soleverse_customer_report_delivery_problem(
  p_notification_id uuid,
  p_report text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_order record;
  reported_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_report is null or length(trim(p_report)) < 10 or length(p_report) > 2000 then
    raise exception 'invalid_delivery_problem_report' using errcode = '22023';
  end if;

  select o.id, o.status into delivery_order
    from public.order_delivery_confirmations c
    join public.orders o on o.id = c.order_id
    where c.id = p_notification_id
      and c.customer_id = auth.uid()
      and o.user_id = auth.uid()
    for update of o;
  if not found then
    raise exception 'delivery_notification_not_found' using errcode = 'P0002';
  end if;
  if delivery_order.status <> 'out_for_delivery' then
    raise exception 'delivery_confirmation_not_current' using errcode = '22023';
  end if;

  update public.order_delivery_confirmations
    set issue_report = trim(p_report), issue_reported_at = now()
    where id = p_notification_id and customer_id = auth.uid()
      and response is false and issue_report is null
    returning issue_reported_at into reported_at;
  if not found then
    raise exception 'delivery_problem_report_not_available' using errcode = '22023';
  end if;
  return reported_at;
end;
$$;

create or replace function public.soleverse_admin_order_detail(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', o.id,
    'reference', o.reference,
    'created_at', o.created_at,
    'customer_name', o.ship_full_name,
    'customer_email', u.email,
    'phone', o.ship_phone,
    'pin_code', o.ship_pin_code,
    'state', o.ship_state,
    'city', o.ship_city,
    'street', o.ship_street,
    'landmark', o.ship_landmark,
    'subtotal_inr', o.subtotal_inr,
    'delivery_fee_inr', o.delivery_fee_inr,
    'total_inr', o.total_inr,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'status', o.status,
    'delivered_at', o.delivered_at,
    'delivery_confirmations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attempt', c.attempt,
        'created_at', c.created_at,
        'response', c.response,
        'responded_at', c.responded_at,
        'issue_report', c.issue_report,
        'issue_reported_at', c.issue_reported_at
      ) order by c.attempt desc)
      from public.order_delivery_confirmations c where c.order_id = o.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'color_label', i.color_label,
        'size', i.size,
        'unit_price_inr', i.unit_price_inr,
        'quantity', i.quantity,
        'line_total_inr', i.line_total_inr
      ) order by i.product_name, i.color_label, i.size)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  ) into result
  from public.orders o
  join auth.users u on u.id = o.user_id
  where o.id = p_order_id;
  return result;
end;
$$;

revoke all on function public.soleverse_admin_update_order_status(uuid, text) from public, anon;
revoke all on function public.soleverse_customer_delivery_notifications() from public, anon;
revoke all on function public.soleverse_customer_respond_delivery(uuid, boolean) from public, anon;
revoke all on function public.soleverse_customer_report_delivery_problem(uuid, text) from public, anon;
revoke all on function public.soleverse_admin_order_detail(uuid) from public, anon;
grant execute on function public.soleverse_admin_update_order_status(uuid, text) to authenticated;
grant execute on function public.soleverse_customer_delivery_notifications() to authenticated;
grant execute on function public.soleverse_customer_respond_delivery(uuid, boolean) to authenticated;
grant execute on function public.soleverse_customer_report_delivery_problem(uuid, text) to authenticated;
grant execute on function public.soleverse_admin_order_detail(uuid) to authenticated;

notify pgrst, 'reload schema';
