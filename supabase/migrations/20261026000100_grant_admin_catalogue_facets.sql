-- Admin product forms write these optional columns added after the initial admin grants.
-- RLS still limits these writes to current administrators.
grant insert (brand, sport, style)
  on public.products to authenticated;
grant update (brand, sport, style)
  on public.products to authenticated;
