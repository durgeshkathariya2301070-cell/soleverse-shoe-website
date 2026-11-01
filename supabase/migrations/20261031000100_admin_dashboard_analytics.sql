-- Admin-only analytics for the dashboard. No table permissions or RLS policies are changed.
-- Order amounts are demo order value: online payments are simulated and COD remains due.
create or replace function public.soleverse_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  india_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_sales_inr', (
      select coalesce(sum(o.total_inr), 0)
      from public.orders o
      where o.status <> 'cancelled'
    ),
    'orders_today', (
      select count(*)
      from public.orders o
      where o.created_at >= (india_today::timestamp at time zone 'Asia/Kolkata')
        and o.created_at < ((india_today + 1)::timestamp at time zone 'Asia/Kolkata')
    ),
    'total_customers', (
      select count(*)
      from public.profiles p
      where not exists (
        select 1 from public.soleverse_admins a where a.user_id = p.id
      )
    ),
    'total_products', (select count(*) from public.products),
    'inventory_variants', coalesce((
      select jsonb_agg(jsonb_build_object('stock', v.stock))
      from public.product_variants v
    ), '[]'::jsonb),
    'sales_by_day', (
      with days as (
        select generate_series(india_today - 364, india_today, interval '1 day')::date as day
      ),
      sales as (
        select (o.created_at at time zone 'Asia/Kolkata')::date as day,
               sum(o.total_inr)::bigint as amount_inr
        from public.orders o
        where o.status <> 'cancelled'
          and o.created_at >= ((india_today - 364)::timestamp at time zone 'Asia/Kolkata')
          and o.created_at < ((india_today + 1)::timestamp at time zone 'Asia/Kolkata')
        group by (o.created_at at time zone 'Asia/Kolkata')::date
      )
      select coalesce(jsonb_agg(
        jsonb_build_object('date', days.day::text, 'amount_inr', coalesce(sales.amount_inr, 0))
        order by days.day
      ), '[]'::jsonb)
      from days
      left join sales on sales.day = days.day
    ),
    'sales_by_product', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', ranked.product_id,
        'name', ranked.name,
        'category', ranked.category,
        'image_url', ranked.image_url,
        'units_sold', ranked.units_sold,
        'sales_value_inr', ranked.sales_value_inr,
        'available_stock', ranked.available_stock
      ))
      from (
        select p.id as product_id,
               p.name,
               p.category,
               coalesce((
                 select pi.image_url
                 from public.product_images pi
                 where pi.product_id = p.id
                 order by pi.position
                 limit 1
               ), p.image_url) as image_url,
               sum(i.quantity)::bigint as units_sold,
               sum(i.line_total_inr)::bigint as sales_value_inr,
               coalesce((
                 select sum(v.stock)::bigint
                 from public.product_variants v
                 where v.product_id = p.id
               ), 0) as available_stock
        from public.order_items i
        join public.orders o on o.id = i.order_id
        join public.products p on p.id = i.product_id
        where o.status <> 'cancelled'
        group by p.id, p.name, p.category, p.image_url
      ) ranked
    ), '[]'::jsonb),
    'order_status_counts', coalesce((
      select jsonb_agg(jsonb_build_object('status', status_counts.status, 'count', status_counts.count))
      from (
        select case when o.status = 'completed' then 'delivered' else o.status end as status,
               count(*)::bigint as count
        from public.orders o
        group by case when o.status = 'completed' then 'delivered' else o.status end
      ) status_counts
    ), '[]'::jsonb),
    'recent_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'reference', recent.reference,
        'created_at', recent.created_at,
        'customer_name', recent.ship_full_name,
        'total_inr', recent.total_inr,
        'status', recent.status,
        'payment_method', recent.payment_method,
        'payment_status', recent.payment_status,
        'demo_payment_method', recent.demo_payment_method
      ) order by recent.created_at desc)
      from (
        select id, reference, created_at, ship_full_name, total_inr, status,
               payment_method, payment_status, demo_payment_method
        from public.orders
        order by created_at desc
        limit 8
      ) recent
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.soleverse_admin_dashboard() from public, anon;
grant execute on function public.soleverse_admin_dashboard() to authenticated;
