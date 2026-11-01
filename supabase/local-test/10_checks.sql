-- Behaviour checks for the Phase 6 migrations. Run by run.sh against a throwaway database.
-- Every check either passes silently or stops the run with a clear message.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create schema t;
grant usage on schema t to anon, authenticated;
alter default privileges in schema t grant execute on functions to anon, authenticated;
create function t.assert(ok boolean, msg text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'CHECK FAILED: %', msg; end if; end $$;

-- run `stmt`; it must fail and the error text must contain `needle`
create function t.expect_error(stmt text, needle text, label text) returns void language plpgsql as $$
declare msg text;
begin
  begin
    execute stmt;
  exception when others then
    get stacked diagnostics msg = message_text;
    msg := msg || ' ' || coalesce(sqlstate, '');
    if position(lower(needle) in lower(msg)) = 0 then
      raise exception 'CHECK FAILED: % (wanted error containing "%", got "%")', label, needle, msg;
    end if;
    return;
  end;
  raise exception 'CHECK FAILED: % (expected an error but the statement succeeded)', label;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com', '{"full_name":"  Asha   Rao "}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com', '{}');

-- Phase 5 trigger: signing up created profiles
select t.assert((select count(*) from public.profiles) = 2, 'profiles trigger creates a row per user');
select t.assert((select full_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Asha   Rao', 'profile name copied (trimmed)');
select t.assert((select pin_code from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') is null, 'new profile has no saved address');

-- Customers may save and read their own profile, but cannot read or modify another customer's row.
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.assert((select count(*) from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, 'customer reads own profile');
update public.profiles
set phone = '9876543210', pin_code = '560001', state = 'Karnataka', city = 'Bengaluru',
    street = '12 MG Road, Flat 4', landmark = 'Near the park'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.assert((select street from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = '12 MG Road, Flat 4', 'customer saves own delivery address');
commit;

begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.assert((select count(*) from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0, 'customer cannot read another profile');
update public.profiles set street = 'Other customer address' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.assert((select street from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = '12 MG Road, Flat 4', 'customer cannot update another profile');
commit;

-- ---------- catalogue ----------
select t.assert((select count(*) from public.products) = 8, '8 sample products seeded');
select t.assert((select count(*) from public.product_variants where stock > 0) > 20, 'variants with stock seeded');
select t.assert((select price_inr from public.products where slug = 'aero-runner-01') = 6999, 'price seeded from sample data');

-- anon can read the catalogue but nothing else
set role anon;
select t.assert((select count(*) from public.products) = 8, 'anon reads products');
select t.expect_error('select * from public.cart_items', 'permission denied', 'anon cannot read cart_items');
select t.expect_error('select * from public.orders', 'permission denied', 'anon cannot read orders');
select t.expect_error($$update public.products set price_inr = 1$$, 'permission denied', 'anon cannot change prices');
select t.expect_error($$select public.place_order(gen_random_uuid(), '[]', '{}', 'cod')$$, 'permission denied', 'anon cannot call place_order');
select t.expect_error($$select public.quote_order('[]')$$, 'permission denied', 'anon cannot call quote_order');
reset role;

-- logged-in customers cannot change the catalogue either
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.expect_error($$update public.products set price_inr = 1$$, 'permission denied', 'customer cannot change prices');
select t.expect_error($$update public.product_variants set stock = 999$$, 'permission denied', 'customer cannot change stock');
select t.expect_error($$insert into public.orders (reference) values ('x')$$, 'permission denied', 'customer cannot insert orders directly');
select t.expect_error($$update public.orders set status = 'cancelled'$$, 'permission denied', 'customer cannot update orders');
select t.expect_error($$insert into public.order_items (order_id) values (gen_random_uuid())$$, 'permission denied', 'customer cannot insert order_items directly');
commit;

-- ---------- cart ----------
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.replace_cart('[
  {"product_id":"sv-001","color_id":"black","size":8,"quantity":2},
  {"product_id":"sv-001","color_id":"black","size":8,"quantity":3},
  {"product_id":"sv-002","color_id":"grey","size":7,"quantity":50},
  {"product_id":"sv-999","color_id":"black","size":8,"quantity":1}
]'::jsonb);
select t.assert((select count(*) from public.cart_items) = 2, 'duplicates merged, unknown product dropped');
select t.assert((select quantity from public.cart_items where product_id = 'sv-001') = 5, 'duplicate quantities added');
select t.assert((select quantity from public.cart_items where product_id = 'sv-002') = 10, 'quantity capped at 10');
select t.expect_error($$select public.replace_cart('"nope"')$$, 'invalid_items', 'non-array bag rejected');
select t.expect_error($$select public.replace_cart('[{"product_id":"sv-001","color_id":"black","size":8,"quantity":0}]')$$, 'invalid_items', 'zero quantity rejected');
select t.expect_error($$select public.replace_cart('[{"product_id":"sv-001","color_id":"black","size":"8","quantity":1}]')$$, 'invalid_items', 'string size rejected');
commit;

begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.assert((select count(*) from public.cart_items) = 0, 'user B cannot see user A bag');
select t.expect_error($$insert into public.cart_items (user_id, product_id, color_id, size, quantity) values ('aaaaaaaa-0000-0000-0000-000000000001','sv-001','black',9,1)$$, 'row-level security', 'user B cannot write into user A bag');
commit;

-- empty list empties the bag
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.replace_cart('[]'::jsonb);
select t.assert((select count(*) from public.cart_items) = 0, 'empty list empties the bag');
commit;

-- ---------- quote ----------
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.assert((public.quote_order('[{"product_id":"sv-001","color_id":"black","size":8,"quantity":2,"price":1,"unit_price_inr":1}]') ->> 'subtotal_inr')::int = 13998,
  'quote ignores any price sent by the browser');
select t.assert((public.quote_order('[{"product_id":"sv-001","color_id":"black","size":8,"quantity":2}]') ->> 'total_inr')::int = 13998 + 99, 'quote adds Rs 99 delivery');
select t.assert((public.quote_order('[{"product_id":"sv-001","color_id":"black","size":10,"quantity":1}]') ->> 'ok')::boolean = false, 'quote flags a sold-out size');
select t.assert((public.quote_order('[{"product_id":"sv-001","color_id":"black","size":10,"quantity":1}]') -> 'lines' -> 0 ->> 'status') = 'insufficient_stock', 'sold-out status named');
select t.assert((public.quote_order('[{"product_id":"nope","color_id":"black","size":10,"quantity":1}]') -> 'lines' -> 0 ->> 'status') = 'unavailable', 'unknown product flagged unavailable');
commit;

-- ---------- place_order: happy path ----------
create table t.state (k text primary key, v text);

begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.replace_cart('[{"product_id":"sv-001","color_id":"black","size":8,"quantity":2},{"product_id":"sv-003","color_id":"red","size":9,"quantity":1}]'::jsonb);
commit;

select stock as s from public.product_variants where product_id='sv-001' and color_id='black' and size=8 \gset before_
select t.assert(:before_s = 6, 'starting stock is 6');

begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.place_order('11111111-1111-1111-1111-111111111111',
  '[{"product_id":"sv-001","color_id":"black","size":8,"quantity":2,"price":1},{"product_id":"sv-003","color_id":"red","size":9,"quantity":1}]'::jsonb,
  '{"full_name":"  Asha   Rao ","phone":"98765 43210","pin_code":"560001","state":"Karnataka","city":"Bengaluru","street":"12 MG Road, Flat 4","landmark":""}'::jsonb,
  'cod') as r \gset
commit;
select (:'r'::jsonb ->> 'reference') as ref, (:'r'::jsonb ->> 'total_inr')::int as total, (:'r'::jsonb ->> 'reused') as reused \gset o1_
select t.assert(:'o1_ref' ~ '^SV-[A-Z0-9]{8}$', 'reference format SV-XXXXXXXX');
select t.assert(:o1_total = 6999*2 + 7999*1 + 99, 'total uses DB prices, not the browser price');
select t.assert(:'o1_reused' = 'false', 'first call is not a replay');
select t.assert((select count(*) from public.orders) = 1, 'one order saved');
select t.assert((select count(*) from public.order_items) = 2, 'two order lines saved');
select t.assert((select subtotal_inr from public.orders) = 21997 and (select delivery_fee_inr from public.orders) = 99, 'subtotal and delivery fee stored');
select t.assert((select payment_status from public.orders) = 'due_on_delivery', 'COD is due on delivery');
select t.assert((select ship_phone from public.orders) = '9876543210', 'phone normalised');
select t.assert((select ship_full_name from public.orders) = 'Asha Rao', 'name normalised');
select t.assert((select ship_landmark from public.orders) is null, 'empty landmark stored as null');
select t.assert((select stock from public.product_variants where product_id='sv-001' and color_id='black' and size=8) = 4, 'stock reduced by 2');
select t.assert((select count(*) from public.cart_items where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0, 'ordered lines left the saved bag');
select t.assert((select unit_price_inr from public.order_items where product_id='sv-001') = 6999, 'order line keeps the unit price');
update public.profiles
set full_name = 'Asha New Name', pin_code = '600001', state = 'Tamil Nadu',
    city = 'Chennai', street = '5 Beach Road', landmark = null
where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.assert((select ship_full_name from public.orders) = 'Asha Rao' and (select ship_pin_code from public.orders) = '560001'
  and (select ship_city from public.orders) = 'Bengaluru' and (select ship_street from public.orders) = '12 MG Road, Flat 4',
  'editing profile does not change the order shipping snapshot');

-- replay with the SAME key: same order, no second order, no second stock change
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.place_order('11111111-1111-1111-1111-111111111111',
  '[{"product_id":"sv-001","color_id":"black","size":8,"quantity":2}]'::jsonb,
  '{"full_name":"Asha Rao","phone":"9876543210","pin_code":"560001","state":"Karnataka","city":"Bengaluru","street":"12 MG Road, Flat 4"}'::jsonb,
  'cod') as r2 \gset
commit;
select t.assert((:'r2'::jsonb ->> 'reference') = :'o1_ref', 'replay returns the same reference');
select t.assert((:'r2'::jsonb ->> 'reused') = 'true', 'replay is flagged reused');
select t.assert((select count(*) from public.orders) = 1, 'still exactly one order');
select t.assert((select stock from public.product_variants where product_id='sv-001' and color_id='black' and size=8) = 4, 'stock not reduced twice');

-- user A reads own order, user B cannot
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.assert((select count(*) from public.orders) = 1, 'owner reads own order');
select t.assert((select count(*) from public.order_items) = 2, 'owner reads own order items');
commit;
begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.assert((select count(*) from public.orders) = 0, 'user B cannot read user A orders');
select t.assert((select count(*) from public.order_items) = 0, 'user B cannot read user A order items');
commit;

-- ---------- place_order: refusals leave NOTHING behind ----------
-- insufficient stock (all-or-nothing: the first, valid line must not be taken either)
begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.expect_error($$select public.place_order('22222222-2222-2222-2222-222222222222',
  '[{"product_id":"sv-001","color_id":"white","size":8,"quantity":1},{"product_id":"sv-001","color_id":"black","size":10,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod')$$,
  'insufficient_stock', 'sold-out line refuses the whole order');
commit;
select t.assert((select count(*) from public.orders) = 1, 'refused order left no row');
select t.assert((select stock from public.product_variants where product_id='sv-001' and color_id='white' and size=8) = 5, 'refused order left stock untouched');

begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.expect_error($$select public.place_order('33333333-3333-3333-3333-333333333333',
  '[{"product_id":"sv-404","color_id":"white","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod')$$,
  'item_unavailable', 'unknown product refused');
select t.expect_error($$select public.place_order('33333333-3333-3333-3333-333333333334', '[]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod')$$,
  'empty_cart', 'empty bag refused');
select t.expect_error($$select public.place_order('33333333-3333-3333-3333-333333333335',
  '[{"product_id":"sv-001","color_id":"white","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'card')$$,
  'invalid_payment_method', 'unknown payment method refused');
select t.expect_error($$select public.place_order('33333333-3333-3333-3333-333333333336',
  '[{"product_id":"sv-001","color_id":"white","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"1234567890","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod')$$,
  'invalid_shipping', 'bad phone refused');
select t.expect_error($$select public.place_order('33333333-3333-3333-3333-333333333337',
  '[{"product_id":"sv-001","color_id":"white","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"060001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod')$$,
  'invalid_shipping', 'bad PIN refused');
select t.expect_error($$select public.place_order('33333333-3333-3333-3333-333333333338',
  '[{"product_id":"sv-001","color_id":"white","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"600001","state":"Narnia","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod')$$,
  'invalid_shipping', 'unknown state refused');
commit;

-- no login at all (token without a user)
begin;
set local role authenticated;
select t.expect_error($$select public.place_order(gen_random_uuid(), '[]', '{}', 'cod')$$, 'not_authenticated', 'no user id means no order');
commit;

-- simulated online payment is stored as simulated
begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select public.place_order('44444444-4444-4444-4444-444444444444',
  '[{"product_id":"sv-004","color_id":"blue","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road","landmark":"Near the post office"}'::jsonb,
  'simulated_online') as r3 \gset
commit;
select t.assert((select payment_status from public.orders where user_id='bbbbbbbb-0000-0000-0000-000000000002') = 'simulated', 'simulated payment recorded as simulated');
select t.assert((select ship_landmark from public.orders where user_id='bbbbbbbb-0000-0000-0000-000000000002') = 'Near the post office', 'landmark stored');

-- table constraints hold even for an administrator
select t.expect_error($$insert into public.orders (reference,user_id,idempotency_key,payment_method,payment_status,subtotal_inr,delivery_fee_inr,total_inr,ship_full_name,ship_phone,ship_pin_code,ship_state,ship_city,ship_street)
  values ('SV-AAAAAAAA','aaaaaaaa-0000-0000-0000-000000000001',gen_random_uuid(),'cod','simulated',100,99,199,'Ab','9123456789','560001','Karnataka','Bengaluru','12 MG Road')$$, 'check', 'COD cannot be marked simulated');
select t.expect_error($$insert into public.orders (reference,user_id,idempotency_key,payment_method,payment_status,subtotal_inr,delivery_fee_inr,total_inr,ship_full_name,ship_phone,ship_pin_code,ship_state,ship_city,ship_street)
  values ('SV-AAAAAAAB','aaaaaaaa-0000-0000-0000-000000000001',gen_random_uuid(),'cod','due_on_delivery',100,99,150,'Ab','9123456789','560001','Karnataka','Bengaluru','12 MG Road')$$, 'check', 'total must equal subtotal + delivery');
select t.expect_error($$update public.product_variants set stock = -1 where product_id='sv-001' and color_id='white' and size=8$$, 'check', 'stock can never go negative');

-- ---------- Phase 7 admin allow-list, RLS, RPCs, and stock-safe fulfilment ----------
begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.assert(public.is_soleverse_admin() is false, 'regular customer is not an admin');
select t.expect_error($$select public.soleverse_admin_dashboard()$$, 'not_authorized', 'regular customer cannot read admin stats');
select t.expect_error($$select * from public.soleverse_admin_list_users()$$, 'not_authorized', 'customer cannot list admins');
select t.expect_error($$select * from public.soleverse_admin_search_users('b@example.com')$$, 'not_authorized', 'customer cannot search auth users');
select t.expect_error($$select public.soleverse_admin_grant_access('aaaaaaaa-0000-0000-0000-000000000001')$$, 'not_authorized', 'customer cannot grant admin access');
select t.expect_error($$select public.soleverse_admin_revoke_access('aaaaaaaa-0000-0000-0000-000000000001')$$, 'not_authorized', 'customer cannot revoke admin access');
select t.expect_error($$insert into public.soleverse_admins (user_id) values ('bbbbbbbb-0000-0000-0000-000000000002')$$, 'permission denied', 'customer cannot self-authorize');
select t.expect_error($$update public.orders set status='cancelled'$$, 'permission denied', 'customer cannot update order status directly');
select t.expect_error($$insert into public.products (id,slug,name,price_inr) values ('sv-hack','hack','Hack',1)$$, 'row-level security', 'customer cannot create products');
commit;

-- Only the database owner (the project owner in production) performs this allow-list insert.
insert into public.soleverse_admins (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');

begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.assert(public.is_soleverse_admin(), 'explicitly allow-listed user is admin');
select t.assert((select count(*) from public.soleverse_admin_list_users()) = 1, 'admin can list current admins');
select t.assert((select user_id from public.soleverse_admin_search_users('B@EX') limit 1) = 'bbbbbbbb-0000-0000-0000-000000000002',
  'admin can search registered accounts by email prefix, case-insensitively');
select t.expect_error($$select * from public.soleverse_admin_search_users('')$$, 'invalid_email_search', 'admin email search validates minimum length');
select t.expect_error($$select public.soleverse_admin_grant_access('cccccccc-0000-0000-0000-000000000003')$$,
  'target_user_not_found', 'admin cannot grant an unregistered user');
select public.soleverse_admin_grant_access('bbbbbbbb-0000-0000-0000-000000000002');
select public.soleverse_admin_grant_access('bbbbbbbb-0000-0000-0000-000000000002');
select t.assert((select count(*) from public.soleverse_admins) = 2, 'duplicate grant does not create duplicate admins');
select t.expect_error($$select public.soleverse_admin_revoke_access('aaaaaaaa-0000-0000-0000-000000000001')$$,
  'cannot_revoke_own_admin_access', 'admin cannot revoke their own access');
select public.soleverse_admin_revoke_access('bbbbbbbb-0000-0000-0000-000000000002');
select t.assert((select count(*) from public.soleverse_admins) = 1, 'admin can revoke another admin');
select t.expect_error($$select public.soleverse_admin_revoke_access('aaaaaaaa-0000-0000-0000-000000000001')$$,
  'cannot_remove_last_admin', 'last administrator cannot be removed');
select public.soleverse_admin_grant_access('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.products (id,slug,name,price_inr,is_active,category,short_description,description,image_url)
values ('sv-admin','admin-test-product','Admin Test Product',3999,false,'training','Local test','Test product','');
insert into public.product_variants (product_id,color_id,color_label,size,stock,color_hex)
values ('sv-admin','black','Core Black',8,5,'#171717');
update public.products set name='Admin Edited Product' where id='sv-admin';
select t.assert((select name from public.products where id='sv-admin')='Admin Edited Product', 'admin can create and edit products');
select t.assert((select stock from public.product_variants where product_id='sv-admin')=5, 'admin can add inventory variants');
update public.product_variants set stock=7 where product_id='sv-admin' and color_id='black' and size=8;
select t.assert((select stock from public.product_variants where product_id='sv-admin')=7, 'admin can safely update non-negative inventory');
select t.assert((public.soleverse_admin_dashboard() ->> 'active_products')::integer=8, 'dashboard counts only active products');
select t.assert((select count(*) from public.soleverse_admin_orders())=2, 'admin order list includes all customer orders');
select t.assert(public.soleverse_admin_order_detail((select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1)) ? 'items',
  'admin order detail includes line items');
select t.expect_error($$update public.orders set status='completed' where user_id='aaaaaaaa-0000-0000-0000-000000000001'$$,
  'permission denied', 'admins cannot bypass checked order status RPC');
select t.expect_error($$select public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'delivered')$$,
  'invalid_order_status', 'admins cannot directly mark an order Delivered');
select t.assert(public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'processing')='processing',
  'valid placed to processing transition succeeds');
select public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'shipped');
select public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'out_for_delivery');
select t.assert((select status from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001')='out_for_delivery',
  'admin moving an order out for delivery creates a persistent customer notification');
select t.assert((public.soleverse_admin_order_detail(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1)) -> 'delivery_confirmations')::jsonb <> '[]'::jsonb,
  'admin order detail exposes delivery confirmation history');
select t.expect_error($$select public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'completed')$$,
  'invalid_order_status', 'admin cannot bypass customer receipt confirmation with legacy Delivered status');
select t.assert((select payment_status from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001')='due_on_delivery',
  'admin fulfilment does not mark COD as paid');
commit;

begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.assert((select count(*) from public.soleverse_customer_delivery_notifications())=0,
  'customer notification query excludes another customer order');
select t.expect_error($$select public.soleverse_customer_respond_delivery(
  (select id from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
   where o.user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1), true)$$,
  'delivery_notification_not_found', 'customer cannot confirm another customer order');
select t.assert((select count(*) from public.order_delivery_confirmations)=0,
  'row-level security prevents reading another customer notification directly');
commit;

begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.assert((select count(*) from public.soleverse_customer_delivery_notifications())=1,
  'customer sees their own pending confirmation after login');
select t.assert((select response is null from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
  where o.user_id='aaaaaaaa-0000-0000-0000-000000000001'),
  'delivery notification remains pending until customer responds');
select t.expect_error($$update public.orders set status='delivered'
  where user_id='aaaaaaaa-0000-0000-0000-000000000001'$$,
  'permission denied', 'customer cannot directly change order status');
select t.assert(public.soleverse_customer_respond_delivery(
  (select id from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
   where o.user_id='aaaaaaaa-0000-0000-0000-000000000001'), false)='out_for_delivery',
  'No response is recorded without marking the order Delivered');
select t.assert((select status from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001')='out_for_delivery',
  'No response leaves order Out for Delivery');
select t.assert((select responded_at is not null and response is false
  from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
  where o.user_id='aaaaaaaa-0000-0000-0000-000000000001'),
  'No response is persisted with a timestamp');
select t.expect_error($$select public.soleverse_customer_respond_delivery(
  (select id from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
   where o.user_id='aaaaaaaa-0000-0000-0000-000000000001'), false)$$,
  'delivery_response_already_recorded', 'duplicate No response is rejected');
select public.soleverse_customer_report_delivery_problem(
  (select id from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
   where o.user_id='aaaaaaaa-0000-0000-0000-000000000001'),
  'The courier marked this delivered but it has not arrived.');
select t.assert((select issue_report is not null and issue_reported_at is not null
  from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
  where o.user_id='aaaaaaaa-0000-0000-0000-000000000001'),
  'customer delivery problem is saved with a timestamp');
commit;

begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'shipped');
select public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'out_for_delivery');
select t.assert((select count(*) from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
  where o.user_id='aaaaaaaa-0000-0000-0000-000000000001')=2,
  'admin retry creates a new persistent notification attempt without deleting history');
commit;

begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.assert(public.soleverse_customer_respond_delivery(
  (select id from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
   where o.user_id='aaaaaaaa-0000-0000-0000-000000000001' order by c.attempt desc limit 1), true)='delivered',
  'Yes response confirms delivery through the server-side function');
select t.assert((select status='delivered' and delivered_at is not null
  from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001'),
  'Yes response changes customer and admin order status to Delivered with timestamp');
select t.expect_error($$select public.soleverse_customer_respond_delivery(
  (select id from public.order_delivery_confirmations c join public.orders o on o.id=c.order_id
   where o.user_id='aaaaaaaa-0000-0000-0000-000000000001' order by c.attempt desc limit 1), true)$$,
  'delivery_response_already_recorded', 'duplicate Yes response is rejected');
commit;

begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.assert(public.is_soleverse_admin(), 'granted account is authorized on its next database check');
commit;

begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.soleverse_admin_revoke_access('bbbbbbbb-0000-0000-0000-000000000002');
commit;

begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select t.assert(public.is_soleverse_admin() is false, 'revoked account is denied on its next database check');
select t.expect_error($$select * from public.soleverse_admin_list_users()$$, 'not_authorized', 'revoked admin cannot list admins');
select t.expect_error($$select public.soleverse_admin_dashboard()$$, 'not_authorized', 'revoked admin cannot call protected admin operations');
select t.expect_error($$select public.soleverse_admin_update_order_status(
  (select id from public.orders where user_id='aaaaaaaa-0000-0000-0000-000000000001' limit 1),'shipped')$$,
  'not_authorized', 'customer cannot invoke admin delivery retry workflow');
commit;

select stock as s from public.product_variants where product_id='sv-005' and color_id='white' and size=8 \gset admin_cancel_before_
begin;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
set local role authenticated;
select public.place_order('77777777-7777-7777-7777-777777777777',
  '[{"product_id":"sv-005","color_id":"white","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Bala K","phone":"9123456789","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod');
commit;
begin;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role authenticated;
select t.assert(public.soleverse_admin_update_order_status(
  (select id from public.orders where idempotency_key='77777777-7777-7777-7777-777777777777'),'cancelled')='cancelled',
  'unshipped order can be cancelled by admin');
commit;
select t.assert((select stock from public.product_variants where product_id='sv-005' and color_id='white' and size=8)=:admin_cancel_before_s,
  'cancelling an unshipped order restores inventory once');

-- re-running a seed does not reset stock that has since changed
\ir ../migrations/20261013000000_create_catalogue.sql
select t.assert((select stock from public.product_variants where product_id='sv-001' and color_id='black' and size=8) = 4, 're-running the catalogue file keeps live stock');

\o
\echo 'ALL SQL CHECKS PASSED'
