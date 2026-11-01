#!/usr/bin/env bash
# Runs the real Phase 5 + Phase 6 migrations on a THROWAWAY local PostgreSQL database and checks the behaviour.
# Needs: a running local PostgreSQL server and a user allowed to create databases (default: current user).
#   PGHOST/PGPORT/PGUSER/PGPASSWORD are read from the environment as usual.
# NEVER point this at your real Supabase project: it creates fake roles and a fake auth schema.
set -euo pipefail
export PGOPTIONS='-c client_min_messages=warning'
cd "$(dirname "$0")"
DB="soleverse_sql_check_$$"
M=../migrations
psql -v ON_ERROR_STOP=1 -q -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true' EXIT
run() { psql -v ON_ERROR_STOP=1 -q -d "$DB" "$@"; }

run -f 00_fake_supabase.sql
for f in $M/*.sql; do echo "applying $(basename "$f")"; run -f "$f" >/dev/null; done
echo "applying every migration a SECOND time (must be safe to re-run)"
for f in $M/*.sql; do run -f "$f" >/dev/null; done

run -f 10_checks.sql

# ---- concurrency: the last pair in stock, wanted by two people at once ----
echo "concurrency checks"
# Make every order slow between "check the stock" and "reduce the stock", so a missing lock cannot hide.
run -c "create function public.test_slow_down() returns trigger language plpgsql as \$\$ begin perform pg_sleep(0.6); return new; end \$\$;
        create trigger test_slow_down before insert on public.order_items for each row execute function public.test_slow_down();" >/dev/null
run -c "insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000003'),('dddddddd-0000-0000-0000-000000000004') on conflict do nothing" >/dev/null
run -c "update public.product_variants set stock = 1 where product_id='sv-005' and color_id='white' and size=8" >/dev/null
order_sql() { # $1 user id  $2 idempotency key
cat <<SQL
begin;
select set_config('request.jwt.claim.sub', '$1', true);
set local role authenticated;
select pg_sleep(0.3);
select public.place_order('$2'::uuid,
  '[{"product_id":"sv-005","color_id":"white","size":8,"quantity":1}]'::jsonb,
  '{"full_name":"Test Buyer","phone":"9123456789","pin_code":"600001","state":"Tamil Nadu","city":"Chennai","street":"5 Beach Road"}'::jsonb,'cod');
commit;
SQL
}
set +e
order_sql cccccccc-0000-0000-0000-000000000003 55555555-5555-5555-5555-555555555551 | run > /tmp/sv_c1.log 2>&1 &
p1=$!
order_sql dddddddd-0000-0000-0000-000000000004 55555555-5555-5555-5555-555555555552 | run > /tmp/sv_c2.log 2>&1 &
p2=$!
wait $p1; wait $p2
set -e
ok=$(cat /tmp/sv_c1.log /tmp/sv_c2.log | grep -c '"reference"' || true)
bad=$(cat /tmp/sv_c1.log /tmp/sv_c2.log | grep -c 'insufficient_stock' || true)
[ "$ok" = "1" ] && [ "$bad" = "1" ] || { echo "CHECK FAILED: expected exactly 1 success and 1 insufficient_stock, got $ok / $bad"; cat /tmp/sv_c1.log /tmp/sv_c2.log; exit 1; }
[ "$(run -tAc "select stock from public.product_variants where product_id='sv-005' and color_id='white' and size=8")" = "0" ] || { echo "CHECK FAILED: stock should be 0"; exit 1; }
echo "  last pair sold exactly once, stock is 0 (no overselling)"

# same user, same key, two requests at the same moment -> ONE order
run -c "update public.product_variants set stock = 5 where product_id='sv-005' and color_id='white' and size=8" >/dev/null
set +e
order_sql cccccccc-0000-0000-0000-000000000003 66666666-6666-6666-6666-666666666666 | run > /tmp/sv_c3.log 2>&1 &
p1=$!
order_sql cccccccc-0000-0000-0000-000000000003 66666666-6666-6666-6666-666666666666 | run > /tmp/sv_c4.log 2>&1 &
p2=$!
wait $p1; wait $p2
set -e
n=$(run -tAc "select count(*) from public.orders where idempotency_key='66666666-6666-6666-6666-666666666666'")
s=$(run -tAc "select stock from public.product_variants where product_id='sv-005' and color_id='white' and size=8")
[ "$n" = "1" ] && [ "$s" = "4" ] || { echo "CHECK FAILED: double submit made $n orders, stock $s"; cat /tmp/sv_c3.log /tmp/sv_c4.log; exit 1; }
echo "  double submit with one key made one order, stock reduced once"
run -c "drop trigger test_slow_down on public.order_items" >/dev/null
echo "SQL BEHAVIOUR CHECKS: ALL PASSED"
