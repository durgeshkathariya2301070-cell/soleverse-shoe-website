-- Add optional catalogue facets and new formal/sports products without replacing prices or stock.
alter table public.products
  add column if not exists brand text,
  add column if not exists sport text,
  add column if not exists style text;

-- Keep basketball within the Sports category; the sport facet carries the specific discipline.
update public.products set category = 'sports' where id in ('sv-003', 'sv-007', 'sv-013', 'sv-014', 'sv-015') and category = 'basketball';

-- Fill only unset metadata so re-running this migration preserves administrator edits.
update public.products as p
set
  brand = coalesce(p.brand, case p.id
    when 'sv-001' then 'Nike'
    when 'sv-002' then 'Adidas'
    when 'sv-003' then 'Jordan'
    when 'sv-004' then 'Nike'
    when 'sv-005' then 'Nike'
    when 'sv-006' then 'Adidas'
    when 'sv-007' then 'Converse'
    when 'sv-008' then 'Adidas'
    when 'sv-009' then 'Jordan'
    when 'sv-010' then 'Converse'
    when 'sv-011' then 'Nike'
    when 'sv-012' then 'Adidas'
    when 'sv-013' then 'Jordan'
    when 'sv-014' then 'Nike'
    when 'sv-015' then 'Converse'
    when 'sv-016' then 'Converse'
    when 'sv-017' then 'Nike'
    when 'sv-018' then 'Adidas'
    when 'sv-019' then 'Nike'
    when 'sv-020' then 'Adidas'
    when 'sv-021' then 'Converse'
    when 'sv-022' then 'Jordan'
    when 'sv-023' then 'Converse'
    when 'sv-024' then 'Nike'
    when 'sv-025' then 'Adidas'
    when 'sv-026' then 'Adidas'
    when 'sv-027' then 'Nike'
    when 'sv-028' then 'Jordan'
    when 'sv-029' then 'Converse'
    when 'sv-030' then 'Adidas'
    when 'sv-031' then 'Nike'
    when 'sv-032' then 'Adidas'
    when 'sv-033' then 'Jordan'
    when 'sv-034' then 'Converse'
    when 'sv-035' then 'Nike'
    when 'sv-036' then 'Adidas'
    when 'sv-037' then 'Jordan'
    when 'sv-038' then 'Converse'
    when 'sv-039' then 'Nike'
    when 'sv-040' then 'Adidas'
    when 'sv-041' then 'Jordan'
    when 'sv-042' then 'Converse'
    else null
  end),
  sport = coalesce(p.sport, case p.id
    when 'sv-003' then 'basketball'
    when 'sv-007' then 'basketball'
    when 'sv-013' then 'basketball'
    when 'sv-014' then 'basketball'
    when 'sv-015' then 'basketball'
    when 'sv-035' then 'football'
    when 'sv-036' then 'football'
    when 'sv-037' then 'football'
    when 'sv-038' then 'football'
    when 'sv-039' then 'cricket'
    when 'sv-040' then 'cricket'
    when 'sv-041' then 'cricket'
    when 'sv-042' then 'cricket'
    else null
  end),
  style = coalesce(p.style, case p.id
    when 'sv-001' then 'Road Runner'
    when 'sv-002' then 'Low Top'
    when 'sv-003' then 'High Top'
    when 'sv-004' then 'Training'
    when 'sv-005' then 'Low Dunk'
    when 'sv-006' then 'Road Runner'
    when 'sv-007' then 'Low Top'
    when 'sv-008' then 'Training'
    when 'sv-009' then 'Low Dunk'
    when 'sv-010' then 'Knit'
    when 'sv-011' then 'Low Dunk'
    when 'sv-012' then 'Road Runner'
    when 'sv-013' then 'High Top'
    when 'sv-014' then 'Court'
    when 'sv-015' then 'Mid Top'
    when 'sv-016' then 'Canvas'
    when 'sv-017' then 'Low Dunk'
    when 'sv-018' then 'Suede'
    when 'sv-019' then 'Low Dunk'
    when 'sv-020' then 'Trainer'
    when 'sv-021' then 'Canvas'
    when 'sv-022' then 'Suede'
    when 'sv-023' then 'Mid Top'
    when 'sv-024' then 'Low Dunk'
    when 'sv-025' then 'Low Top'
    when 'sv-026' then 'Trail Runner'
    when 'sv-027' then 'Trail Runner'
    when 'sv-028' then 'Trail Runner'
    when 'sv-029' then 'Trail Runner'
    when 'sv-030' then 'Trail Runner'
    when 'sv-031' then 'Formal'
    when 'sv-032' then 'Formal'
    when 'sv-033' then 'Formal'
    when 'sv-034' then 'Formal'
    when 'sv-035' then 'Football'
    when 'sv-036' then 'Football'
    when 'sv-037' then 'Football'
    when 'sv-038' then 'Football'
    when 'sv-039' then 'Cricket'
    when 'sv-040' then 'Cricket'
    when 'sv-041' then 'Cricket'
    when 'sv-042' then 'Cricket'
    else null
  end)
where p.id in ('sv-001', 'sv-002', 'sv-003', 'sv-004', 'sv-005', 'sv-006', 'sv-007', 'sv-008', 'sv-009', 'sv-010', 'sv-011', 'sv-012', 'sv-013', 'sv-014', 'sv-015', 'sv-016', 'sv-017', 'sv-018', 'sv-019', 'sv-020', 'sv-021', 'sv-022', 'sv-023', 'sv-024', 'sv-025', 'sv-026', 'sv-027', 'sv-028', 'sv-029', 'sv-030', 'sv-031', 'sv-032', 'sv-033', 'sv-034', 'sv-035', 'sv-036', 'sv-037', 'sv-038', 'sv-039', 'sv-040', 'sv-041', 'sv-042');

insert into public.products (id, slug, name, price_inr, is_active, category, short_description, description, image_url, brand, sport, style) values
  ('sv-031', 'meridian-derby', 'Meridian Derby', 6999, true, 'formal', 'A sleek, understated profile for polished occasions.', 'Meridian Derby pairs a smooth, structured upper with a clean low-profile sole and cushioned footbed. Its restrained silhouette brings a smart finish to workdays and evening plans.', '/products/street-court-sneaker.jpg', 'Nike', null, 'Formal'),
  ('sv-032', 'atelier-oxford', 'Atelier Oxford', 7499, true, 'formal', 'A refined lace-up with soft support for long days.', 'A neat lace-up profile, padded collar and flexible outsole give Atelier Oxford a comfortable, composed feel. Subtle panel details keep the design versatile for formal and smart-casual dressing.', '/products/retro-court-sneaker.jpg', 'Adidas', null, 'Formal'),
  ('sv-033', 'evening-line', 'Evening Line', 8299, true, 'formal', 'Clean lines and a cushioned step after hours.', 'Evening Line combines a minimal dark upper with discreet stitching and a supportive footbed. The light, flexible construction makes it easy to wear from office hours to dinner.', '/products/everyday-sneaker-white.jpg', 'Jordan', null, 'Formal'),
  ('sv-034', 'city-polish', 'City Polish', 6499, true, 'formal', 'A modern dress-casual shoe built for city commutes.', 'City Polish balances a tidy, polished shape with a cushioned insole and grippy rubber outsole. A soft lining and flexible sole help keep each step comfortable throughout the day.', '/products/court-sneaker-detail.jpg', 'Converse', null, 'Formal'),
  ('sv-035', 'touchline-grip', 'Touchline Grip', 5999, true, 'sports', 'A secure, flexible sports shoe for football training.', 'Touchline Grip has a close-fitting upper, reinforced toe and grippy outsole for quick movement through training drills. Its supportive shape is designed for comfort during practice and warm-ups.', '/products/lightweight-running-shoe.jpg', 'Nike', 'football', 'Football'),
  ('sv-036', 'matchday-rapid', 'Matchday Rapid', 7499, true, 'sports', 'Lightweight support for fast football sessions.', 'A breathable upper and stable midfoot wrap help Matchday Rapid feel secure through changes of pace. Flexible forefoot grooves support quick steps in training and recreational play.', '/products/training-knit-runner.jpg', 'Adidas', 'football', 'Football'),
  ('sv-037', 'pitch-control', 'Pitch Control', 6799, true, 'sports', 'Responsive cushioning for football practice.', 'Pitch Control combines a padded heel, durable overlays and a lightweight cushioned base for repeated training sessions. A textured outsole provides dependable grip on suitable playing surfaces.', '/products/flex-trainer.jpg', 'Jordan', 'football', 'Football'),
  ('sv-038', 'wingback-flex', 'Wingback Flex', 6299, true, 'sports', 'A flexible training shoe for quick football footwork.', 'Wingback Flex uses a close, supportive fit and a durable rubber outsole to stay comfortable during drills. The lightweight build and padded tongue make it a versatile practice-day option.', '/products/aero-runner-red.jpg', 'Converse', 'football', 'Football'),
  ('sv-039', 'crease-ready', 'Crease Ready', 6199, true, 'sports', 'Stable comfort for cricket training and fielding.', 'Crease Ready features a secure heel, cushioned midsole and robust outsole for comfortable movement through practice and fielding drills. Breathable panels help keep the fit fresh.', '/products/flex-trainer.jpg', 'Nike', 'cricket', 'Cricket'),
  ('sv-040', 'boundary-runner', 'Boundary Runner', 7199, true, 'sports', 'Supportive cushioning for long cricket sessions.', 'Boundary Runner balances a breathable upper with a stable platform and durable tread. A padded collar and responsive cushioning support repeated running and movement during cricket practice.', '/products/lightweight-running-shoe.jpg', 'Adidas', 'cricket', 'Cricket'),
  ('sv-041', 'powerplay-stud', 'Powerplay Stud', 7899, true, 'sports', 'A secure sports profile for cricket drills.', 'Powerplay Stud offers a reinforced upper, comfortable ankle padding and a grippy outsole for training-day confidence. Its supportive fit helps with quick starts and repeated movement.', '/products/training-knit-runner.jpg', 'Jordan', 'cricket', 'Cricket'),
  ('sv-042', 'all-rounder-pro', 'All-Rounder Pro', 6899, true, 'sports', 'Versatile cushioning for cricket practice and warm-ups.', 'All-Rounder Pro combines a breathable mesh upper, stable heel and flexible sole for all-day comfort around training. The durable construction is suited to warm-ups and general practice.', '/products/aero-runner-red.jpg', 'Converse', 'cricket', 'Cricket')
on conflict (id) do nothing;

insert into public.product_variants (product_id, color_id, color_label, size, stock, color_hex) values
  ('sv-031', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-031', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-031', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-031', 'navy', 'Midnight Navy', 9, 2, '#26334F'),
  ('sv-031', 'navy', 'Midnight Navy', 10, 3, '#26334F'),
  ('sv-031', 'navy', 'Midnight Navy', 11, 1, '#26334F'),
  ('sv-032', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-032', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-032', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-032', 'grey', 'Stone Grey', 9, 2, '#A3A39C'),
  ('sv-032', 'grey', 'Stone Grey', 10, 3, '#A3A39C'),
  ('sv-032', 'grey', 'Stone Grey', 11, 1, '#A3A39C'),
  ('sv-033', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-033', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-033', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-033', 'navy', 'Midnight Navy', 9, 2, '#26334F'),
  ('sv-033', 'navy', 'Midnight Navy', 10, 3, '#26334F'),
  ('sv-033', 'navy', 'Midnight Navy', 11, 1, '#26334F'),
  ('sv-034', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-034', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-034', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-034', 'sand', 'Warm Sand', 9, 2, '#C8B99B'),
  ('sv-034', 'sand', 'Warm Sand', 10, 3, '#C8B99B'),
  ('sv-034', 'sand', 'Warm Sand', 11, 1, '#C8B99B'),
  ('sv-035', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-035', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-035', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-035', 'lime', 'Volt Lime', 9, 2, '#D9FF64'),
  ('sv-035', 'lime', 'Volt Lime', 10, 3, '#D9FF64'),
  ('sv-035', 'lime', 'Volt Lime', 11, 1, '#D9FF64'),
  ('sv-036', 'blue', 'Deep Blue', 6, 2, '#26407A'),
  ('sv-036', 'blue', 'Deep Blue', 7, 3, '#26407A'),
  ('sv-036', 'blue', 'Deep Blue', 8, 0, '#26407A'),
  ('sv-036', 'orange', 'Ember Orange', 9, 2, '#D96B32'),
  ('sv-036', 'orange', 'Ember Orange', 10, 3, '#D96B32'),
  ('sv-036', 'orange', 'Ember Orange', 11, 1, '#D96B32'),
  ('sv-037', 'forest', 'Forest Green', 6, 2, '#315B42'),
  ('sv-037', 'forest', 'Forest Green', 7, 3, '#315B42'),
  ('sv-037', 'forest', 'Forest Green', 8, 0, '#315B42'),
  ('sv-037', 'black', 'Core Black', 9, 2, '#171717'),
  ('sv-037', 'black', 'Core Black', 10, 3, '#171717'),
  ('sv-037', 'black', 'Core Black', 11, 1, '#171717'),
  ('sv-038', 'red', 'Signal Red', 6, 2, '#D7382D'),
  ('sv-038', 'red', 'Signal Red', 7, 3, '#D7382D'),
  ('sv-038', 'red', 'Signal Red', 8, 0, '#D7382D'),
  ('sv-038', 'white', 'Cloud White', 9, 2, '#F2F2EE'),
  ('sv-038', 'white', 'Cloud White', 10, 3, '#F2F2EE'),
  ('sv-038', 'white', 'Cloud White', 11, 1, '#F2F2EE'),
  ('sv-039', 'white', 'Cloud White', 6, 2, '#F2F2EE'),
  ('sv-039', 'white', 'Cloud White', 7, 3, '#F2F2EE'),
  ('sv-039', 'white', 'Cloud White', 8, 0, '#F2F2EE'),
  ('sv-039', 'blue', 'Deep Blue', 9, 2, '#26407A'),
  ('sv-039', 'blue', 'Deep Blue', 10, 3, '#26407A'),
  ('sv-039', 'blue', 'Deep Blue', 11, 1, '#26407A'),
  ('sv-040', 'lime', 'Volt Lime', 6, 2, '#D9FF64'),
  ('sv-040', 'lime', 'Volt Lime', 7, 3, '#D9FF64'),
  ('sv-040', 'lime', 'Volt Lime', 8, 0, '#D9FF64'),
  ('sv-040', 'navy', 'Midnight Navy', 9, 2, '#26334F'),
  ('sv-040', 'navy', 'Midnight Navy', 10, 3, '#26334F'),
  ('sv-040', 'navy', 'Midnight Navy', 11, 1, '#26334F'),
  ('sv-041', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-041', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-041', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-041', 'orange', 'Ember Orange', 9, 2, '#D96B32'),
  ('sv-041', 'orange', 'Ember Orange', 10, 3, '#D96B32'),
  ('sv-041', 'orange', 'Ember Orange', 11, 1, '#D96B32'),
  ('sv-042', 'grey', 'Stone Grey', 6, 2, '#A3A39C'),
  ('sv-042', 'grey', 'Stone Grey', 7, 3, '#A3A39C'),
  ('sv-042', 'grey', 'Stone Grey', 8, 0, '#A3A39C'),
  ('sv-042', 'forest', 'Forest Green', 9, 2, '#315B42'),
  ('sv-042', 'forest', 'Forest Green', 10, 3, '#315B42'),
  ('sv-042', 'forest', 'Forest Green', 11, 1, '#315B42')
on conflict (product_id, color_id, size) do nothing;
