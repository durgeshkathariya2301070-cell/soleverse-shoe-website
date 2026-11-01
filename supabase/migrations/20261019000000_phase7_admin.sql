-- SOLEVERSE Phase 7: database-authorized administration.
-- Apply after 20261013000200_create_orders.sql.
-- The first administrator must be inserted manually by the project owner using Supabase SQL Editor.
-- No website role can grant administrator access.

create table if not exists public.soleverse_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.soleverse_admins enable row level security;
revoke all on table public.soleverse_admins from public, anon, authenticated;

alter table public.products
  add column if not exists category text not null default 'lifestyle'
    check (category ~ '^[a-z0-9-]{1,40}$'),
  add column if not exists short_description text not null default ''
    check (char_length(short_description) <= 240),
  add column if not exists description text not null default ''
    check (char_length(description) <= 5000),
  add column if not exists image_url text not null default ''
    check (char_length(image_url) <= 2048 and (image_url = '' or image_url ~ '^(https?://|/)'));

alter table public.product_variants
  add column if not exists color_hex text not null default '#777777'
    check (color_hex ~ '^#[0-9A-Fa-f]{6}$');

update public.products set
  category = case id
    when 'sv-001' then 'running'
    when 'sv-002' then 'lifestyle'
    when 'sv-003' then 'streetwear'
    when 'sv-004' then 'training'
    when 'sv-005' then 'lifestyle'
    when 'sv-006' then 'running'
    when 'sv-007' then 'streetwear'
    when 'sv-008' then 'training'
    else category
  end,
  short_description = case id
    when 'sv-001' then 'A low-profile runner with a clean, minimal upper.'
    when 'sv-002' then 'A relaxed everyday sneaker in a single tone.'
    when 'sv-003' then 'A high-top built to stand out on the street.'
    when 'sv-004' then 'A supportive trainer shape for gym sessions.'
    when 'sv-005' then 'A low-cut everyday pair with simple lines.'
    when 'sv-006' then 'A lightweight runner for everyday movement.'
    when 'sv-007' then 'A court-inspired silhouette with a bold profile.'
    when 'sv-008' then 'A flexible everyday sneaker built for comfort.'
    else short_description
  end,
  image_url = case id
    when 'sv-001' then 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'
    when 'sv-002' then 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a'
    when 'sv-003' then 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb'
    when 'sv-004' then 'https://images.unsplash.com/photo-1491553895911-0055eca6402d'
    when 'sv-005' then 'https://images.unsplash.com/photo-1549298916-b41d501d3772'
    when 'sv-006' then 'https://images.unsplash.com/photo-1539185441755-769473a23570'
    when 'sv-007' then 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519'
    when 'sv-008' then 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2'
    else image_url
  end
where id in ('sv-001','sv-002','sv-003','sv-004','sv-005','sv-006','sv-007','sv-008')
  and short_description = '' and description = '' and image_url = '';

update public.product_variants set color_hex = case color_id
  when 'black' then '#171717'
  when 'white' then '#F2F2EE'
  when 'lime' then '#D9FF64'
  when 'grey' then '#A3A39C'
  when 'red' then '#D7382D'
  when 'blue' then '#26407A'
  else color_hex
end
where color_hex = '#777777';

create or replace function public.is_soleverse_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.soleverse_admins a where a.user_id = (select auth.uid())
  )
$$;

revoke all on function public.is_soleverse_admin() from public;
grant execute on function public.is_soleverse_admin() to anon, authenticated;

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
  on public.products for select to anon, authenticated
  using (is_active or (select public.is_soleverse_admin()));

drop policy if exists "Anyone can read variants of active products" on public.product_variants;
create policy "Anyone can read variants of active products"
  on public.product_variants for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select public.is_soleverse_admin())
  );

grant insert (id, slug, name, price_inr, is_active, category, short_description, description, image_url)
  on public.products to authenticated;
grant update (slug, name, price_inr, is_active, category, short_description, description, image_url)
  on public.products to authenticated;

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all to authenticated
  using ((select public.is_soleverse_admin()))
  with check ((select public.is_soleverse_admin()));

grant insert (product_id, color_id, color_label, size, stock, color_hex)
  on public.product_variants to authenticated;
grant update (color_label, size, stock, color_hex)
  on public.product_variants to authenticated;

drop policy if exists "Admins manage product variants" on public.product_variants;
create policy "Admins manage product variants"
  on public.product_variants for all to authenticated
  using ((select public.is_soleverse_admin()))
  with check ((select public.is_soleverse_admin()));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('placed', 'processing', 'shipped', 'completed', 'cancelled'));

-- Order status changes go only through the checked SECURITY DEFINER function below.
-- There is deliberately no table UPDATE grant for the client, even for administrators.

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
    'total_sales_inr', (select coalesce(sum(total_inr), 0) from public.orders where status = 'completed'),
    'pending_orders', (select count(*) from public.orders where status in ('placed', 'processing', 'shipped')),
    'completed_orders', (select count(*) from public.orders where status = 'completed'),
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

create or replace function public.soleverse_admin_orders()
returns table (
  id uuid,
  reference text,
  created_at timestamptz,
  customer_name text,
  customer_email text,
  phone text,
  total_inr integer,
  payment_method text,
  payment_status text,
  status text
)
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
    select o.id, o.reference, o.created_at, o.ship_full_name, u.email::text,
           o.ship_phone, o.total_inr, o.payment_method, o.payment_status, o.status
    from public.orders o
    join auth.users u on u.id = o.user_id
    order by o.created_at desc
    limit 500;
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

create or replace function public.soleverse_admin_update_order_status(p_order_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  line record;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('processing', 'shipped', 'completed', 'cancelled') then
    raise exception 'invalid_order_status' using errcode = '22023';
  end if;

  select status into current_status
    from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if current_status = p_status then return current_status; end if;
  if not (
    (current_status = 'placed' and p_status in ('processing', 'cancelled'))
    or (current_status = 'processing' and p_status in ('shipped', 'cancelled'))
    or (current_status = 'shipped' and p_status = 'completed')
  ) then
    raise exception 'invalid_order_status_transition' using errcode = '22023';
  end if;

  update public.orders set status = p_status where id = p_order_id;
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

revoke all on function public.soleverse_admin_dashboard() from public, anon;
revoke all on function public.soleverse_admin_orders() from public, anon;
revoke all on function public.soleverse_admin_order_detail(uuid) from public, anon;
revoke all on function public.soleverse_admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.soleverse_admin_dashboard() to authenticated;
grant execute on function public.soleverse_admin_orders() to authenticated;
grant execute on function public.soleverse_admin_order_detail(uuid) to authenticated;
grant execute on function public.soleverse_admin_update_order_status(uuid, text) to authenticated;
