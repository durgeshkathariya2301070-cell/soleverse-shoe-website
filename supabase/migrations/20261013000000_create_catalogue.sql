-- =====================================================================================
-- SOLEVERSE Phase 6, file 1 of 3: the catalogue (prices and stock the server trusts)
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Run the three Phase 6 files in order (000000, 000100, 000200). Safe to run more than once.
--
-- WHY THIS EXISTS: the browser must never tell the server what a shoe costs. Orders are priced
-- from these two tables, which visitors can read but can NOT change.
-- The numbers below are the SAMPLE data from src/data/products.js (demonstration values, not a
-- real catalogue). Re-running this file never overwrites prices or stock you changed later.
-- =====================================================================================

create table if not exists public.products (
  id         text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name       text not null check (char_length(name) between 1 and 120),
  price_inr  integer not null check (price_inr > 0 and price_inr <= 1000000),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per colour + size. `stock` is the number of pairs we can still sell.
create table if not exists public.product_variants (
  product_id  text not null references public.products (id) on delete cascade,
  color_id    text not null check (color_id ~ '^[a-z0-9-]{1,30}$'),
  color_label text not null check (char_length(color_label) between 1 and 60),
  size        integer not null check (size between 1 and 20),
  stock       integer not null default 0 check (stock >= 0),
  primary key (product_id, color_id, size)
);

alter table public.products enable row level security;
alter table public.product_variants enable row level security;

-- Everyone may READ the catalogue. Nobody can write to it from the website.
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.product_variants to anon, authenticated;

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
  on public.products for select to anon, authenticated
  using (is_active);

drop policy if exists "Anyone can read variants of active products" on public.product_variants;
create policy "Anyone can read variants of active products"
  on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

-- BEGIN GENERATED SEED (made by "npm run generate-seed" from src/data/products.js; do not edit by hand)
-- Existing rows are left alone ("do nothing"), so re-running never resets prices or stock.
insert into public.products (id, slug, name, price_inr) values
  ('sv-001', 'aero-runner-01', 'Aero Runner 01', 6999),
  ('sv-002', 'stride-mono', 'Stride Mono', 5499),
  ('sv-003', 'vertex-high', 'Vertex High', 7999),
  ('sv-004', 'pulse-trainer', 'Pulse Trainer', 4999),
  ('sv-005', 'drift-low', 'Drift Low', 5999),
  ('sv-006', 'sprint-lite', 'Sprint Lite', 4499),
  ('sv-007', 'block-court', 'Block Court', 6499),
  ('sv-008', 'core-flex', 'Core Flex', 5299)
on conflict (id) do nothing;

insert into public.product_variants (product_id, color_id, color_label, size, stock) values
  ('sv-001', 'black', 'Core Black', 6, 2),
  ('sv-001', 'black', 'Core Black', 7, 4),
  ('sv-001', 'black', 'Core Black', 8, 6),
  ('sv-001', 'black', 'Core Black', 9, 3),
  ('sv-001', 'black', 'Core Black', 10, 0),
  ('sv-001', 'black', 'Core Black', 11, 1),
  ('sv-001', 'lime', 'Volt Lime', 6, 0),
  ('sv-001', 'lime', 'Volt Lime', 7, 3),
  ('sv-001', 'lime', 'Volt Lime', 8, 2),
  ('sv-001', 'lime', 'Volt Lime', 9, 0),
  ('sv-001', 'lime', 'Volt Lime', 10, 4),
  ('sv-001', 'lime', 'Volt Lime', 11, 0),
  ('sv-001', 'white', 'Cloud White', 6, 1),
  ('sv-001', 'white', 'Cloud White', 7, 0),
  ('sv-001', 'white', 'Cloud White', 8, 5),
  ('sv-001', 'white', 'Cloud White', 9, 4),
  ('sv-001', 'white', 'Cloud White', 10, 0),
  ('sv-001', 'white', 'Cloud White', 11, 2),
  ('sv-002', 'grey', 'Stone Grey', 6, 3),
  ('sv-002', 'grey', 'Stone Grey', 7, 2),
  ('sv-002', 'grey', 'Stone Grey', 8, 0),
  ('sv-002', 'grey', 'Stone Grey', 9, 5),
  ('sv-002', 'grey', 'Stone Grey', 10, 4),
  ('sv-002', 'black', 'Core Black', 6, 0),
  ('sv-002', 'black', 'Core Black', 7, 1),
  ('sv-002', 'black', 'Core Black', 8, 4),
  ('sv-002', 'black', 'Core Black', 9, 2),
  ('sv-002', 'black', 'Core Black', 10, 0),
  ('sv-003', 'black', 'Core Black', 7, 2),
  ('sv-003', 'black', 'Core Black', 8, 3),
  ('sv-003', 'black', 'Core Black', 9, 5),
  ('sv-003', 'black', 'Core Black', 10, 2),
  ('sv-003', 'black', 'Core Black', 11, 1),
  ('sv-003', 'red', 'Signal Red', 7, 0),
  ('sv-003', 'red', 'Signal Red', 8, 2),
  ('sv-003', 'red', 'Signal Red', 9, 3),
  ('sv-003', 'red', 'Signal Red', 10, 0),
  ('sv-003', 'red', 'Signal Red', 11, 0),
  ('sv-003', 'white', 'Cloud White', 7, 1),
  ('sv-003', 'white', 'Cloud White', 8, 0),
  ('sv-003', 'white', 'Cloud White', 9, 2),
  ('sv-003', 'white', 'Cloud White', 10, 0),
  ('sv-003', 'white', 'Cloud White', 11, 3),
  ('sv-004', 'blue', 'Deep Blue', 6, 4),
  ('sv-004', 'blue', 'Deep Blue', 7, 5),
  ('sv-004', 'blue', 'Deep Blue', 8, 3),
  ('sv-004', 'blue', 'Deep Blue', 9, 2),
  ('sv-004', 'blue', 'Deep Blue', 10, 3),
  ('sv-004', 'blue', 'Deep Blue', 11, 0),
  ('sv-004', 'grey', 'Stone Grey', 6, 0),
  ('sv-004', 'grey', 'Stone Grey', 7, 2),
  ('sv-004', 'grey', 'Stone Grey', 8, 4),
  ('sv-004', 'grey', 'Stone Grey', 9, 3),
  ('sv-004', 'grey', 'Stone Grey', 10, 1),
  ('sv-004', 'grey', 'Stone Grey', 11, 0),
  ('sv-005', 'white', 'Cloud White', 6, 2),
  ('sv-005', 'white', 'Cloud White', 7, 3),
  ('sv-005', 'white', 'Cloud White', 8, 4),
  ('sv-005', 'white', 'Cloud White', 9, 2),
  ('sv-005', 'white', 'Cloud White', 10, 1),
  ('sv-005', 'black', 'Core Black', 6, 0),
  ('sv-005', 'black', 'Core Black', 7, 2),
  ('sv-005', 'black', 'Core Black', 8, 2),
  ('sv-005', 'black', 'Core Black', 9, 3),
  ('sv-005', 'black', 'Core Black', 10, 0),
  ('sv-006', 'lime', 'Volt Lime', 6, 1),
  ('sv-006', 'lime', 'Volt Lime', 7, 2),
  ('sv-006', 'lime', 'Volt Lime', 8, 3),
  ('sv-006', 'lime', 'Volt Lime', 9, 4),
  ('sv-006', 'lime', 'Volt Lime', 10, 2),
  ('sv-006', 'lime', 'Volt Lime', 11, 0),
  ('sv-006', 'grey', 'Stone Grey', 6, 0),
  ('sv-006', 'grey', 'Stone Grey', 7, 0),
  ('sv-006', 'grey', 'Stone Grey', 8, 2),
  ('sv-006', 'grey', 'Stone Grey', 9, 0),
  ('sv-006', 'grey', 'Stone Grey', 10, 3),
  ('sv-006', 'grey', 'Stone Grey', 11, 2),
  ('sv-007', 'white', 'Cloud White', 7, 0),
  ('sv-007', 'white', 'Cloud White', 8, 0),
  ('sv-007', 'white', 'Cloud White', 9, 0),
  ('sv-007', 'white', 'Cloud White', 10, 0),
  ('sv-007', 'red', 'Signal Red', 7, 0),
  ('sv-007', 'red', 'Signal Red', 8, 0),
  ('sv-007', 'red', 'Signal Red', 9, 0),
  ('sv-007', 'red', 'Signal Red', 10, 0),
  ('sv-008', 'black', 'Core Black', 6, 2),
  ('sv-008', 'black', 'Core Black', 7, 3),
  ('sv-008', 'black', 'Core Black', 8, 4),
  ('sv-008', 'black', 'Core Black', 9, 5),
  ('sv-008', 'black', 'Core Black', 10, 3),
  ('sv-008', 'black', 'Core Black', 11, 2),
  ('sv-008', 'blue', 'Deep Blue', 6, 0),
  ('sv-008', 'blue', 'Deep Blue', 7, 1),
  ('sv-008', 'blue', 'Deep Blue', 8, 2),
  ('sv-008', 'blue', 'Deep Blue', 9, 2),
  ('sv-008', 'blue', 'Deep Blue', 10, 0),
  ('sv-008', 'blue', 'Deep Blue', 11, 0)
on conflict (product_id, color_id, size) do nothing;
-- END GENERATED SEED
