-- Persist which demo-only online option a customer selected.
-- The existing payment_method/payment_status values remain unchanged for compatibility:
-- demo UPI and card orders are still `simulated_online` / `simulated`.
alter table public.orders
  add column if not exists demo_payment_method text;

alter table public.orders
  drop constraint if exists orders_demo_payment_method_check;
alter table public.orders
  add constraint orders_demo_payment_method_check
  check (demo_payment_method is null or demo_payment_method in ('demo_upi', 'demo_card'));

-- The existing place_order function continues to validate customer ownership, shipping,
-- authoritative prices, stock locks, idempotency, and atomic order/item/inventory writes.
-- This wrapper records the demo channel in the same transaction, rolling everything back
-- if the selected channel cannot be safely associated with the resulting order.
create or replace function public.place_demo_order(
  p_idempotency_key uuid,
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
  stored_method text;
  mapped_method text;
  order_result jsonb;
  changed_rows integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_demo_method is null or p_demo_method not in ('cod', 'demo_upi', 'demo_card') then
    raise exception 'invalid_payment_method' using errcode = 'P0001';
  end if;

  mapped_method := case when p_demo_method = 'cod' then 'cod' else 'simulated_online' end;
  stored_method := case when p_demo_method = 'cod' then null else p_demo_method end;
  order_result := public.place_order(
    p_idempotency_key,
    p_items,
    p_shipping,
    mapped_method
  );

  update public.orders
     set demo_payment_method = stored_method
   where id = (order_result ->> 'order_id')::uuid
     and user_id = uid
     and payment_method = mapped_method
     and (demo_payment_method is null or demo_payment_method = stored_method);

  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'demo_payment_method_mismatch' using errcode = 'P0001';
  end if;

  return order_result || jsonb_build_object('demo_payment_method', stored_method);
end;
$$;

revoke all on function public.place_demo_order(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.place_demo_order(uuid, jsonb, jsonb, text) to authenticated;

create or replace function public.soleverse_admin_demo_payment_method(p_order_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  stored_method text;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select demo_payment_method into stored_method
    from public.orders
   where id = p_order_id;
  return stored_method;
end;
$$;

revoke all on function public.soleverse_admin_demo_payment_method(uuid) from public, anon;
grant execute on function public.soleverse_admin_demo_payment_method(uuid) to authenticated;
