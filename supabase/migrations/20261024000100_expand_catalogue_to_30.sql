-- Add the 22 new catalogue entries without replacing existing product or inventory values.
-- Existing seeded products are only normalized when their fields still match the original defaults.
insert into public.products (id, slug, name, price_inr, is_active, category, short_description, description, image_url) values
  ('sv-009', 'terrace-form', 'Terrace Form', 5799, true, 'lifestyle', 'A refined terrace profile with a soft, easy-wearing feel.', 'Terrace Form pairs a low-profile cupsole with a cushioned footbed and understated panel work. A comfortable lining and versatile shape make it a natural choice for everyday plans.', '/products/street-court-sneaker.jpg'),
  ('sv-010', 'weekender-knit', 'Weekender Knit', 6299, true, 'lifestyle', 'A flexible knit upper for long, unhurried days.', 'A breathable knit upper gives Weekender Knit a soft, flexible fit, while the supportive midsole adds comfort over long days on your feet. The understated outsole keeps the look relaxed.', '/products/court-sneaker-detail.jpg'),
  ('sv-011', 'studio-court', 'Studio Court', 6899, true, 'lifestyle', 'A crisp court-inspired sneaker with a cushioned step.', 'Studio Court takes cues from classic indoor footwear and updates them with a padded collar, smooth layered upper and durable cupsole. A cushioned footbed keeps the profile comfortable through daily wear.', '/products/retro-court-sneaker.jpg'),
  ('sv-012', 'stride-tempo', 'Stride Tempo', 7499, true, 'running', 'Responsive cushioning for steady road sessions.', 'Stride Tempo combines a breathable engineered mesh upper with a springy, full-length midsole and dependable road traction. The secure heel fit supports a smooth, consistent stride.', '/products/aero-runner-red.jpg'),
  ('sv-013', 'baseline-rise', 'Baseline Rise', 8299, true, 'sports', 'A supportive high-top with a stable court-ready base.', 'Baseline Rise features a padded high collar, structured overlays and a broad traction pattern for confident cuts. Its cushioned midsole helps absorb impact through quick changes of direction.', '/products/basketball-high-top.jpg'),
  ('sv-014', 'arc-drive', 'Arc Drive', 8999, true, 'sports', 'Lock-in support and grip for fast court movement.', 'A reinforced midfoot cage and secure lacing keep Arc Drive stable during lateral movement. Underfoot cushioning softens landings while the multi-directional rubber tread grips indoor courts.', '/products/court-sneaker-detail.jpg'),
  ('sv-015', 'paintline-mid', 'Paintline Mid', 7799, true, 'sports', 'A padded mid-cut built for comfort beyond the buzzer.', 'Paintline Mid balances ankle padding with a flexible forefoot and a durable cupsole. A breathable tongue and cushioned heel make it a comfortable option for play and everyday wear.', '/products/basketball-court-low.jpg'),
  ('sv-016', 'harbor-canvas', 'Harbor Canvas', 3999, true, 'casual', 'A lightweight canvas low-top with everyday versatility.', 'Harbor Canvas keeps things simple with a durable woven upper, padded footbed and flexible rubber outsole. The easy low-top shape works from weekend errands to relaxed evenings.', '/products/canvas-sneaker.jpg'),
  ('sv-017', 'northline-cup', 'Northline Cup', 4599, true, 'casual', 'A clean cupsole sneaker with a comfortably padded collar.', 'Northline Cup pairs a smooth, easy-care upper with a supportive cupsole and soft collar padding. Its restrained profile is built for repeat wear and simple everyday styling.', '/products/everyday-sneaker-white.jpg'),
  ('sv-018', 'daybreak-suede', 'Daybreak Suede', 5499, true, 'casual', 'A soft-touch casual sneaker with a grounded profile.', 'Daybreak Suede features a layered upper, cushioned insole and flexible outsole for all-day comfort. Low-key colour blocking gives this versatile pair a considered, easygoing finish.', '/products/court-sneaker-detail.jpg'),
  ('sv-019', 'field-note-low', 'Field Note Low', 4299, true, 'casual', 'A relaxed low-top shaped for daily walks and commutes.', 'A padded heel, soft lining and flexible sole give Field Note Low a comfortable feel from the first step. Its classic low-top construction is easy to wear through the week.', '/products/court-sneaker-detail.jpg'),
  ('sv-020', 'everyday-pacer', 'Everyday Pacer', 4999, true, 'casual', 'A cushioned, breathable pair for days on the move.', 'Everyday Pacer pairs a lightweight mesh-and-panel upper with a supportive midsole and durable rubber pods. A padded tongue and collar add comfort for longer days out.', '/products/training-knit-runner.jpg'),
  ('sv-021', 'curbside-canvas', 'Curbside Canvas', 4499, true, 'skate', 'A durable canvas skate shoe with a grippy flat sole.', 'Curbside Canvas is built around a reinforced toe, padded tongue and sturdy flat outsole for board feel and daily durability. The breathable upper keeps the fit comfortable between sessions.', '/products/skate-low-top.jpg'),
  ('sv-022', 'switchback-suede', 'Switchback Suede', 5299, true, 'skate', 'A reinforced low-top with a flexible, grippy outsole.', 'Switchback Suede uses durable overlay panels at high-wear areas, a padded collar and a flexible rubber outsole. Its stable low profile stays comfortable on and off the board.', '/products/street-court-sneaker.jpg'),
  ('sv-023', 'rail-yard-mid', 'Rail Yard Mid', 5899, true, 'skate', 'A padded mid-top that adds coverage without bulk.', 'Rail Yard Mid adds ankle coverage with soft padding and a secure lace fit while keeping the sole flexible for board feel. A reinforced toe cap helps it stand up to repeated sessions.', '/products/basketball-court-low.jpg'),
  ('sv-024', 'gripline-low', 'Gripline Low', 4799, true, 'skate', 'A low-profile skate shoe with dependable board feel.', 'Gripline Low combines a close-to-the-ground shape with a textured rubber outsole and padded heel. The tough upper is designed for frequent wear, while the flexible forefoot stays easy to move in.', '/products/canvas-sneaker.jpg'),
  ('sv-025', 'alley-track', 'Alley Track', 5599, true, 'skate', 'A cushioned skate silhouette with reinforced side panels.', 'Alley Track pairs reinforced side panels with a padded fit and grippy outsole for stability through everyday skating. Subtle colour accents give its durable build a distinctive finish.', '/products/court-sneaker-detail.jpg'),
  ('sv-026', 'ridgepath-1', 'Ridgepath 1', 7999, true, 'trail', 'A rugged trail runner with a secure, breathable upper.', 'Ridgepath 1 is designed for mixed terrain with a protective toe bumper, supportive heel and multi-directional outsole lugs. The breathable upper helps keep the fit comfortable on longer routes.', '/products/trail-runner.jpg'),
  ('sv-027', 'granite-loop', 'Granite Loop', 8499, true, 'trail', 'Confident traction and cushioning for changing ground.', 'Granite Loop brings a stable platform, cushioned midsole and grippy lug pattern together for park paths and rocky tracks. A reinforced toe and secure lace structure help protect and hold the foot.', '/products/training-knit-runner.jpg'),
  ('sv-028', 'wildline-crest', 'Wildline Crest', 9299, true, 'trail', 'Protective trail comfort with a steady, sure-footed ride.', 'Wildline Crest uses a supportive upper, protective toe wrap and high-traction outsole for uneven routes. Balanced cushioning and a secure heel make it a dependable companion for trail days.', '/products/lightweight-running-shoe.jpg'),
  ('sv-029', 'earthbound-pace', 'Earthbound Pace', 7499, true, 'trail', 'A versatile off-road runner with a flexible lugged sole.', 'Earthbound Pace blends a lightweight build with a grippy outsole and abrasion-resistant overlays. Its flexible ride suits a mix of compact trails, gravel paths and everyday outdoor miles.', '/products/aero-runner-red.jpg'),
  ('sv-030', 'summit-mesh', 'Summit Mesh', 8999, true, 'trail', 'Breathable trail support for long days outside.', 'Summit Mesh pairs an airy upper with a reinforced toe, supportive midsole and durable traction lugs. A secure fit and cushioned ride help you stay comfortable across changing terrain.', '/products/flex-trainer.jpg')
on conflict (id) do nothing;

insert into public.product_variants (product_id, color_id, color_label, size, stock, color_hex) values
  ('sv-009', 'white', 'Cloud White', 6, 2, '#F2F2EE'),
  ('sv-009', 'white', 'Cloud White', 7, 3, '#F2F2EE'),
  ('sv-009', 'white', 'Cloud White', 8, 0, '#F2F2EE'),
  ('sv-009', 'forest', 'Forest Green', 9, 2, '#315B42'),
  ('sv-009', 'forest', 'Forest Green', 10, 3, '#315B42'),
  ('sv-009', 'forest', 'Forest Green', 11, 1, '#315B42'),
  ('sv-010', 'grey', 'Stone Grey', 6, 2, '#A3A39C'),
  ('sv-010', 'grey', 'Stone Grey', 7, 3, '#A3A39C'),
  ('sv-010', 'grey', 'Stone Grey', 8, 0, '#A3A39C'),
  ('sv-010', 'sand', 'Warm Sand', 9, 2, '#C8B99B'),
  ('sv-010', 'sand', 'Warm Sand', 10, 3, '#C8B99B'),
  ('sv-010', 'sand', 'Warm Sand', 11, 1, '#C8B99B'),
  ('sv-011', 'white', 'Cloud White', 6, 2, '#F2F2EE'),
  ('sv-011', 'white', 'Cloud White', 7, 3, '#F2F2EE'),
  ('sv-011', 'white', 'Cloud White', 8, 0, '#F2F2EE'),
  ('sv-011', 'navy', 'Midnight Navy', 9, 2, '#26334F'),
  ('sv-011', 'navy', 'Midnight Navy', 10, 3, '#26334F'),
  ('sv-011', 'navy', 'Midnight Navy', 11, 1, '#26334F'),
  ('sv-012', 'blue', 'Deep Blue', 6, 2, '#26407A'),
  ('sv-012', 'blue', 'Deep Blue', 7, 3, '#26407A'),
  ('sv-012', 'blue', 'Deep Blue', 8, 0, '#26407A'),
  ('sv-012', 'lime', 'Volt Lime', 9, 2, '#D9FF64'),
  ('sv-012', 'lime', 'Volt Lime', 10, 3, '#D9FF64'),
  ('sv-012', 'lime', 'Volt Lime', 11, 1, '#D9FF64'),
  ('sv-013', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-013', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-013', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-013', 'orange', 'Ember Orange', 9, 2, '#D96B32'),
  ('sv-013', 'orange', 'Ember Orange', 10, 3, '#D96B32'),
  ('sv-013', 'orange', 'Ember Orange', 11, 1, '#D96B32'),
  ('sv-014', 'navy', 'Midnight Navy', 6, 2, '#26334F'),
  ('sv-014', 'navy', 'Midnight Navy', 7, 3, '#26334F'),
  ('sv-014', 'navy', 'Midnight Navy', 8, 0, '#26334F'),
  ('sv-014', 'white', 'Cloud White', 9, 2, '#F2F2EE'),
  ('sv-014', 'white', 'Cloud White', 10, 3, '#F2F2EE'),
  ('sv-014', 'white', 'Cloud White', 11, 1, '#F2F2EE'),
  ('sv-015', 'red', 'Signal Red', 6, 2, '#D7382D'),
  ('sv-015', 'red', 'Signal Red', 7, 3, '#D7382D'),
  ('sv-015', 'red', 'Signal Red', 8, 0, '#D7382D'),
  ('sv-015', 'black', 'Core Black', 9, 2, '#171717'),
  ('sv-015', 'black', 'Core Black', 10, 3, '#171717'),
  ('sv-015', 'black', 'Core Black', 11, 1, '#171717'),
  ('sv-016', 'white', 'Cloud White', 6, 2, '#F2F2EE'),
  ('sv-016', 'white', 'Cloud White', 7, 3, '#F2F2EE'),
  ('sv-016', 'white', 'Cloud White', 8, 0, '#F2F2EE'),
  ('sv-016', 'blue', 'Deep Blue', 9, 2, '#26407A'),
  ('sv-016', 'blue', 'Deep Blue', 10, 3, '#26407A'),
  ('sv-016', 'blue', 'Deep Blue', 11, 1, '#26407A'),
  ('sv-017', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-017', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-017', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-017', 'sand', 'Warm Sand', 9, 2, '#C8B99B'),
  ('sv-017', 'sand', 'Warm Sand', 10, 3, '#C8B99B'),
  ('sv-017', 'sand', 'Warm Sand', 11, 1, '#C8B99B'),
  ('sv-018', 'grey', 'Stone Grey', 6, 2, '#A3A39C'),
  ('sv-018', 'grey', 'Stone Grey', 7, 3, '#A3A39C'),
  ('sv-018', 'grey', 'Stone Grey', 8, 0, '#A3A39C'),
  ('sv-018', 'forest', 'Forest Green', 9, 2, '#315B42'),
  ('sv-018', 'forest', 'Forest Green', 10, 3, '#315B42'),
  ('sv-018', 'forest', 'Forest Green', 11, 1, '#315B42'),
  ('sv-019', 'white', 'Cloud White', 6, 2, '#F2F2EE'),
  ('sv-019', 'white', 'Cloud White', 7, 3, '#F2F2EE'),
  ('sv-019', 'white', 'Cloud White', 8, 0, '#F2F2EE'),
  ('sv-019', 'red', 'Signal Red', 9, 2, '#D7382D'),
  ('sv-019', 'red', 'Signal Red', 10, 3, '#D7382D'),
  ('sv-019', 'red', 'Signal Red', 11, 1, '#D7382D'),
  ('sv-020', 'navy', 'Midnight Navy', 6, 2, '#26334F'),
  ('sv-020', 'navy', 'Midnight Navy', 7, 3, '#26334F'),
  ('sv-020', 'navy', 'Midnight Navy', 8, 0, '#26334F'),
  ('sv-020', 'grey', 'Stone Grey', 9, 2, '#A3A39C'),
  ('sv-020', 'grey', 'Stone Grey', 10, 3, '#A3A39C'),
  ('sv-020', 'grey', 'Stone Grey', 11, 1, '#A3A39C'),
  ('sv-021', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-021', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-021', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-021', 'white', 'Cloud White', 9, 2, '#F2F2EE'),
  ('sv-021', 'white', 'Cloud White', 10, 3, '#F2F2EE'),
  ('sv-021', 'white', 'Cloud White', 11, 1, '#F2F2EE'),
  ('sv-022', 'sand', 'Warm Sand', 6, 2, '#C8B99B'),
  ('sv-022', 'sand', 'Warm Sand', 7, 3, '#C8B99B'),
  ('sv-022', 'sand', 'Warm Sand', 8, 0, '#C8B99B'),
  ('sv-022', 'forest', 'Forest Green', 9, 2, '#315B42'),
  ('sv-022', 'forest', 'Forest Green', 10, 3, '#315B42'),
  ('sv-022', 'forest', 'Forest Green', 11, 1, '#315B42'),
  ('sv-023', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-023', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-023', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-023', 'orange', 'Ember Orange', 9, 2, '#D96B32'),
  ('sv-023', 'orange', 'Ember Orange', 10, 3, '#D96B32'),
  ('sv-023', 'orange', 'Ember Orange', 11, 1, '#D96B32'),
  ('sv-024', 'blue', 'Deep Blue', 6, 2, '#26407A'),
  ('sv-024', 'blue', 'Deep Blue', 7, 3, '#26407A'),
  ('sv-024', 'blue', 'Deep Blue', 8, 0, '#26407A'),
  ('sv-024', 'white', 'Cloud White', 9, 2, '#F2F2EE'),
  ('sv-024', 'white', 'Cloud White', 10, 3, '#F2F2EE'),
  ('sv-024', 'white', 'Cloud White', 11, 1, '#F2F2EE'),
  ('sv-025', 'red', 'Signal Red', 6, 2, '#D7382D'),
  ('sv-025', 'red', 'Signal Red', 7, 3, '#D7382D'),
  ('sv-025', 'red', 'Signal Red', 8, 0, '#D7382D'),
  ('sv-025', 'navy', 'Midnight Navy', 9, 2, '#26334F'),
  ('sv-025', 'navy', 'Midnight Navy', 10, 3, '#26334F'),
  ('sv-025', 'navy', 'Midnight Navy', 11, 1, '#26334F'),
  ('sv-026', 'forest', 'Forest Green', 6, 2, '#315B42'),
  ('sv-026', 'forest', 'Forest Green', 7, 3, '#315B42'),
  ('sv-026', 'forest', 'Forest Green', 8, 0, '#315B42'),
  ('sv-026', 'orange', 'Ember Orange', 9, 2, '#D96B32'),
  ('sv-026', 'orange', 'Ember Orange', 10, 3, '#D96B32'),
  ('sv-026', 'orange', 'Ember Orange', 11, 1, '#D96B32'),
  ('sv-027', 'grey', 'Stone Grey', 6, 2, '#A3A39C'),
  ('sv-027', 'grey', 'Stone Grey', 7, 3, '#A3A39C'),
  ('sv-027', 'grey', 'Stone Grey', 8, 0, '#A3A39C'),
  ('sv-027', 'lime', 'Volt Lime', 9, 2, '#D9FF64'),
  ('sv-027', 'lime', 'Volt Lime', 10, 3, '#D9FF64'),
  ('sv-027', 'lime', 'Volt Lime', 11, 1, '#D9FF64'),
  ('sv-028', 'black', 'Core Black', 6, 2, '#171717'),
  ('sv-028', 'black', 'Core Black', 7, 3, '#171717'),
  ('sv-028', 'black', 'Core Black', 8, 0, '#171717'),
  ('sv-028', 'forest', 'Forest Green', 9, 2, '#315B42'),
  ('sv-028', 'forest', 'Forest Green', 10, 3, '#315B42'),
  ('sv-028', 'forest', 'Forest Green', 11, 1, '#315B42'),
  ('sv-029', 'orange', 'Ember Orange', 6, 2, '#D96B32'),
  ('sv-029', 'orange', 'Ember Orange', 7, 3, '#D96B32'),
  ('sv-029', 'orange', 'Ember Orange', 8, 0, '#D96B32'),
  ('sv-029', 'navy', 'Midnight Navy', 9, 2, '#26334F'),
  ('sv-029', 'navy', 'Midnight Navy', 10, 3, '#26334F'),
  ('sv-029', 'navy', 'Midnight Navy', 11, 1, '#26334F'),
  ('sv-030', 'blue', 'Deep Blue', 6, 2, '#26407A'),
  ('sv-030', 'blue', 'Deep Blue', 7, 3, '#26407A'),
  ('sv-030', 'blue', 'Deep Blue', 8, 0, '#26407A'),
  ('sv-030', 'sand', 'Warm Sand', 9, 2, '#C8B99B'),
  ('sv-030', 'sand', 'Warm Sand', 10, 3, '#C8B99B'),
  ('sv-030', 'sand', 'Warm Sand', 11, 1, '#C8B99B')
on conflict (product_id, color_id, size) do nothing;

update public.products as p
set
  category = case 
    when p.id = 'sv-001' and p.category = 'running' then 'running'
    when p.id = 'sv-002' and p.category = 'lifestyle' then 'lifestyle'
    when p.id = 'sv-003' and p.category = 'streetwear' then 'sports'
    when p.id = 'sv-004' and p.category = 'training' then 'running'
    when p.id = 'sv-005' and p.category = 'lifestyle' then 'lifestyle'
    when p.id = 'sv-006' and p.category = 'running' then 'running'
    when p.id = 'sv-007' and p.category = 'streetwear' then 'sports'
    when p.id = 'sv-008' and p.category = 'training' then 'running'
    else p.category
  end,
  short_description = case 
    when p.id = 'sv-001' and p.short_description = 'A low-profile runner with a clean, minimal upper.' then 'A low-profile runner with a clean, minimal upper.'
    when p.id = 'sv-002' and p.short_description = 'A relaxed everyday sneaker in a single tone.' then 'A relaxed everyday sneaker in a single tone.'
    when p.id = 'sv-003' and p.short_description = 'A high-top built to stand out on the street.' then 'A high-top built to stand out on the street.'
    when p.id = 'sv-004' and p.short_description = 'A supportive trainer shape for gym sessions.' then 'A supportive trainer shape for gym sessions.'
    when p.id = 'sv-005' and p.short_description = 'A low-cut everyday pair with simple lines.' then 'A low-cut everyday pair with simple lines.'
    when p.id = 'sv-006' and p.short_description = 'A lightweight runner for everyday movement.' then 'A light, fast-looking runner.'
    when p.id = 'sv-007' and p.short_description = 'A court-inspired silhouette with a bold profile.' then 'A court-inspired shape with a bold profile.'
    when p.id = 'sv-008' and p.short_description = 'A flexible everyday sneaker built for comfort.' then 'A versatile trainer for mixed workouts.'
    else p.short_description
  end,
  description = case 
    when p.id = 'sv-001' and p.description = '' then 'Built for daily miles and changing pace, the Aero Runner 01 pairs a breathable mesh upper with a cushioned midsole and a stable, grippy outsole. Its streamlined shape keeps the ride light from warm-up to cooldown.'
    when p.id = 'sv-002' and p.description = '' then 'A clean everyday profile with a soft padded collar, easy-wearing cushioning and a tonal finish. The Stride Mono is designed to move comfortably between a morning commute and a late afternoon walk.'
    when p.id = 'sv-003' and p.description = '' then 'The Vertex High brings ankle coverage and a confident court-inspired shape together with a padded tongue and cushioned footbed. A grippy rubber tread keeps the classic high-top ready for all-day wear.'
    when p.id = 'sv-004' and p.description = '' then 'A versatile daily trainer with a breathable engineered upper, supportive heel counter and resilient cushioning. The Pulse Trainer balances a secure fit with a smooth transition for steady road sessions.'
    when p.id = 'sv-005' and p.description = '' then 'The Drift Low keeps its lines simple with a low-cut profile, cushioned insole and durable rubber outsole. Soft neutral panels make this an easy everyday pair to style across the week.'
    when p.id = 'sv-006' and p.description = '' then 'Made for light, uncomplicated runs, Sprint Lite combines an airy upper with responsive cushioning and flexible forefoot grooves. Its low-weight build feels comfortable for short loops and everyday movement.'
    when p.id = 'sv-007' and p.description = '' then 'A low-cut court silhouette built around a supportive cupsole, padded lining and clean panel construction. Block Court pairs a steady underfoot feel with an easy shape for everyday rotation.'
    when p.id = 'sv-008' and p.description = '' then 'Core Flex is a dependable all-rounder with a flexible forefoot, supportive midfoot wrap and cushioned heel. Its balanced construction suits light training sessions and active days on the go.'
    else p.description
  end,
  image_url = case 
    when p.id = 'sv-001' and p.image_url = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff' then '/products/aero-runner-red.jpg'
    when p.id = 'sv-002' and p.image_url = 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a' then '/products/everyday-sneaker-white.jpg'
    when p.id = 'sv-003' and p.image_url = 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb' then '/products/basketball-high-top.jpg'
    when p.id = 'sv-004' and p.image_url = 'https://images.unsplash.com/photo-1491553895911-0055eca6402d' then '/products/training-knit-runner.jpg'
    when p.id = 'sv-005' and p.image_url = 'https://images.unsplash.com/photo-1549298916-b41d501d3772' then '/products/retro-court-sneaker.jpg'
    when p.id = 'sv-006' and p.image_url = 'https://images.unsplash.com/photo-1539185441755-769473a23570' then '/products/lightweight-running-shoe.jpg'
    when p.id = 'sv-007' and p.image_url = 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519' then '/products/basketball-court-low.jpg'
    when p.id = 'sv-008' and p.image_url = 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2' then '/products/flex-trainer.jpg'
    else p.image_url
  end
where p.id in ('sv-001', 'sv-002', 'sv-003', 'sv-004', 'sv-005', 'sv-006', 'sv-007', 'sv-008');
