-- Hide sample listings whose stored category, image, material, or identity cannot
-- be verified from the current product record. Product/order/inventory rows remain intact.

-- These sample-brand assignments were generated independently of the source photos.
-- Clear only the known seed values; preserve any brand an administrator has corrected.
update public.products as p
set brand = null
from (values
  ('sv-001', 'aero-runner-01', 'Nike'),
  ('sv-002', 'stride-mono', 'Adidas'),
  ('sv-003', 'vertex-high', 'Jordan'),
  ('sv-004', 'pulse-trainer', 'Nike'),
  ('sv-005', 'drift-low', 'Nike'),
  ('sv-006', 'sprint-lite', 'Adidas'),
  ('sv-007', 'block-court', 'Converse'),
  ('sv-008', 'core-flex', 'Adidas'),
  ('sv-009', 'terrace-form', 'Jordan'),
  ('sv-010', 'weekender-knit', 'Converse'),
  ('sv-011', 'studio-court', 'Nike'),
  ('sv-012', 'stride-tempo', 'Adidas'),
  ('sv-013', 'baseline-rise', 'Jordan'),
  ('sv-014', 'arc-drive', 'Nike'),
  ('sv-015', 'paintline-mid', 'Converse'),
  ('sv-016', 'harbor-canvas', 'Converse'),
  ('sv-017', 'northline-cup', 'Nike'),
  ('sv-018', 'daybreak-suede', 'Adidas'),
  ('sv-019', 'field-note-low', 'Nike'),
  ('sv-020', 'everyday-pacer', 'Adidas'),
  ('sv-021', 'curbside-canvas', 'Converse'),
  ('sv-022', 'switchback-suede', 'Jordan'),
  ('sv-023', 'rail-yard-mid', 'Converse'),
  ('sv-024', 'gripline-low', 'Nike'),
  ('sv-025', 'alley-track', 'Adidas'),
  ('sv-026', 'ridgepath-1', 'Adidas'),
  ('sv-027', 'granite-loop', 'Nike'),
  ('sv-028', 'wildline-crest', 'Jordan'),
  ('sv-029', 'earthbound-pace', 'Converse'),
  ('sv-030', 'summit-mesh', 'Adidas'),
  ('sv-031', 'meridian-derby', 'Nike'),
  ('sv-032', 'atelier-oxford', 'Adidas'),
  ('sv-033', 'evening-line', 'Jordan'),
  ('sv-034', 'city-polish', 'Converse'),
  ('sv-035', 'touchline-grip', 'Nike'),
  ('sv-036', 'matchday-rapid', 'Adidas'),
  ('sv-037', 'pitch-control', 'Jordan'),
  ('sv-038', 'wingback-flex', 'Converse'),
  ('sv-039', 'crease-ready', 'Nike'),
  ('sv-040', 'boundary-runner', 'Adidas'),
  ('sv-041', 'powerplay-stud', 'Jordan'),
  ('sv-042', 'all-rounder-pro', 'Converse')
) as seed(id, slug, unverified_brand)
where p.id = seed.id
  and p.slug = seed.slug
  and p.brand = seed.unverified_brand;

-- Use distinct category-appropriate sample photography when no admin gallery exists.
update public.products as p
set image_url = '/products/skate-low-top.jpg'
where p.id = 'sv-003'
  and p.slug = 'vertex-high'
  and p.category = 'sports'
  and p.sport = 'basketball'
  and p.image_url = '/products/retro-court-sneaker.jpg'
  and not exists (select 1 from public.product_images pi where pi.product_id = p.id);

update public.products as p
set image_url = '/products/retro-court-sneaker.jpg'
where p.id = 'sv-019'
  and p.slug = 'field-note-low'
  and p.category = 'casual'
  and p.image_url = '/products/court-sneaker-detail.jpg'
  and not exists (select 1 from public.product_images pi where pi.product_id = p.id);

-- Preserve records and order history; only unpublish entries still carrying their
-- known unverified metadata and no administrator-managed gallery.
update public.products as p
set is_active = false
where p.is_active
  and not exists (select 1 from public.product_images pi where pi.product_id = p.id)
  and (
    (p.id = 'sv-013' and p.slug = 'baseline-rise' and p.category = 'sports' and p.sport = 'basketball' and p.image_url = '/products/retro-court-sneaker.jpg')
    or (p.id = 'sv-014' and p.slug = 'arc-drive' and p.category = 'sports' and p.sport = 'basketball' and p.image_url = '/products/basketball-court-low.jpg')
    or (p.id = 'sv-015' and p.slug = 'paintline-mid' and p.category = 'sports' and p.sport = 'basketball' and p.style = 'Mid Top' and p.image_url = '/products/retro-court-sneaker.jpg')
    or (p.id = 'sv-018' and p.slug = 'daybreak-suede' and p.category = 'casual' and p.style = 'Suede' and p.image_url = '/products/court-sneaker-detail.jpg')
    or (p.id = 'sv-022' and p.slug = 'switchback-suede' and p.category = 'skate' and p.style = 'Suede' and p.image_url = '/products/canvas-sneaker.jpg')
    or (p.id = 'sv-023' and p.slug = 'rail-yard-mid' and p.category = 'skate' and p.style = 'Mid Top' and p.image_url = '/products/canvas-sneaker.jpg')
    or (p.id = 'sv-024' and p.slug = 'gripline-low' and p.category = 'skate' and p.image_url = '/products/canvas-sneaker.jpg')
    or (p.id = 'sv-025' and p.slug = 'alley-track' and p.category = 'skate' and p.image_url = '/products/canvas-sneaker.jpg')
    or (p.id = 'sv-030' and p.slug = 'summit-mesh' and p.category = 'trail' and p.image_url = '/products/trail-runner-altra.jpg')
    or (p.id = 'sv-031' and p.slug = 'meridian-derby' and p.category = 'formal' and p.image_url = '/products/formal-dress-shoe-01.jpg')
    or (p.id = 'sv-032' and p.slug = 'atelier-oxford' and p.category = 'formal' and p.image_url = '/products/formal-dress-shoe-02.jpg')
    or (p.id = 'sv-033' and p.slug = 'evening-line' and p.category = 'formal' and p.image_url = '/products/formal-dress-shoe-03.jpg')
    or (p.id = 'sv-034' and p.slug = 'city-polish' and p.category = 'formal' and p.image_url = '/products/formal-dress-shoe-04.jpg')
    or (p.id = 'sv-039' and p.slug = 'crease-ready' and p.category = 'sports' and p.sport = 'cricket' and p.image_url = '/products/training-knit-runner.jpg')
    or (p.id = 'sv-040' and p.slug = 'boundary-runner' and p.category = 'sports' and p.sport = 'cricket' and p.image_url = '/products/lightweight-running-shoe.jpg')
    or (p.id = 'sv-041' and p.slug = 'powerplay-stud' and p.category = 'sports' and p.sport = 'cricket' and p.image_url = '/products/flex-trainer.jpg')
    or (p.id = 'sv-042' and p.slug = 'all-rounder-pro' and p.category = 'sports' and p.sport = 'cricket' and p.image_url = '/products/aero-runner-red.jpg')
  );
