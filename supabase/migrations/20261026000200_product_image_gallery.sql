-- Persist ordered product galleries and allow current administrators to upload product photos.
-- Existing product.image_url values remain the primary image until a gallery is saved.

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products (id) on delete cascade,
  image_url   text not null check (
    char_length(image_url) between 1 and 2048
    and (image_url ~* '^https?://[^[:space:]]+$' or image_url ~ '^/[^/][^[:space:]]*$')
  ),
  alt_text    text not null default '' check (char_length(alt_text) <= 200),
  position    integer not null check (position between 0 and 49),
  created_at  timestamptz not null default now(),
  unique (product_id, position)
);

create index if not exists product_images_product_position_idx
  on public.product_images (product_id, position);

alter table public.product_images enable row level security;
revoke all on table public.product_images from anon, authenticated;
grant select on table public.product_images to anon, authenticated;
grant insert, update, delete on table public.product_images to authenticated;

drop policy if exists "Anyone can read active product images" on public.product_images;
create policy "Anyone can read active product images"
  on public.product_images for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select public.is_soleverse_admin())
  );

drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images"
  on public.product_images for all to authenticated
  using ((select public.is_soleverse_admin()))
  with check ((select public.is_soleverse_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (select public.is_soleverse_admin())
  );

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_soleverse_admin())
  )
  with check (
    bucket_id = 'product-images'
    and (select public.is_soleverse_admin())
  );

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_soleverse_admin())
  );

create or replace function public.soleverse_admin_save_product(
  p_product jsonb,
  p_is_new boolean,
  p_images jsonb,
  p_variants jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_id text := p_product ->> 'id';
  image jsonb;
  variant jsonb;
begin
  if not public.is_soleverse_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(p_product) <> 'object'
     or jsonb_typeof(p_images) <> 'array'
     or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'invalid_product_payload' using errcode = '22023';
  end if;
  if coalesce((p_product ->> 'is_active')::boolean, false)
     and jsonb_array_length(p_variants) = 0 then
    raise exception 'product_requires_variant' using errcode = '23514';
  end if;

  if p_is_new then
    insert into public.products (
      id, slug, name, price_inr, is_active, category, brand, sport, style,
      short_description, description, image_url
    ) values (
      v_product_id, p_product ->> 'slug', p_product ->> 'name',
      (p_product ->> 'price_inr')::integer,
      coalesce((p_product ->> 'is_active')::boolean, false),
      p_product ->> 'category', nullif(p_product ->> 'brand', ''),
      nullif(p_product ->> 'sport', ''), nullif(p_product ->> 'style', ''),
      coalesce(p_product ->> 'short_description', ''),
      coalesce(p_product ->> 'description', ''),
      coalesce(p_product ->> 'image_url', '')
    );
  else
    update public.products set
      slug = p_product ->> 'slug',
      name = p_product ->> 'name',
      price_inr = (p_product ->> 'price_inr')::integer,
      is_active = coalesce((p_product ->> 'is_active')::boolean, false),
      category = p_product ->> 'category',
      brand = nullif(p_product ->> 'brand', ''),
      sport = nullif(p_product ->> 'sport', ''),
      style = nullif(p_product ->> 'style', ''),
      short_description = coalesce(p_product ->> 'short_description', ''),
      description = coalesce(p_product ->> 'description', ''),
      image_url = coalesce(p_product ->> 'image_url', '')
    where id = v_product_id;
    if not found then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.product_images as pi where pi.product_id = v_product_id;
  for image in select value from jsonb_array_elements(p_images)
  loop
    insert into public.product_images (product_id, image_url, alt_text, position)
    values (
      v_product_id,
      image ->> 'image_url',
      coalesce(image ->> 'alt_text', ''),
      (image ->> 'position')::integer
    );
  end loop;

  for variant in select value from jsonb_array_elements(p_variants)
  loop
    insert into public.product_variants (
      product_id, color_id, color_label, size, stock, color_hex
    ) values (
      v_product_id,
      variant ->> 'color_id',
      variant ->> 'color_label',
      (variant ->> 'size')::integer,
      (variant ->> 'stock')::integer,
      variant ->> 'color_hex'
    )
    on conflict (product_id, color_id, size) do update set
      color_label = excluded.color_label,
      stock = excluded.stock,
      color_hex = excluded.color_hex;
  end loop;

  return jsonb_build_object('id', v_product_id);
end;
$$;

revoke all on function public.soleverse_admin_save_product(jsonb, boolean, jsonb, jsonb) from public, anon;
grant execute on function public.soleverse_admin_save_product(jsonb, boolean, jsonb, jsonb) to authenticated;
