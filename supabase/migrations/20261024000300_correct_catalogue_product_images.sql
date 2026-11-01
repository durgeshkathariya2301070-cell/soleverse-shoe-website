-- Correct mismatched catalogue photography without touching customer, order, variant, or inventory data.
-- Each image changes only while it still equals the known previous value; admin-edited paths are preserved.
update public.products as p
set
  image_url = case
    when p.id = 'sv-003' and p.image_url = '/products/basketball-high-top.jpg' then '/products/skate-low-top.jpg'
    when p.id = 'sv-005' and p.image_url = '/products/retro-court-sneaker.jpg' then '/products/court-sneaker-detail.jpg'
    when p.id = 'sv-007' and p.image_url = '/products/basketball-court-low.jpg' then '/products/street-court-sneaker.jpg'
    when p.id = 'sv-010' and p.image_url = '/products/court-sneaker-detail.jpg' then '/products/training-knit-runner.jpg'
    when p.id = 'sv-011' and p.image_url = '/products/retro-court-sneaker.jpg' then '/products/basketball-court-low.jpg'
    when p.id = 'sv-013' and p.image_url = '/products/basketball-high-top.jpg' then '/products/retro-court-sneaker.jpg'
    when p.id = 'sv-014' and p.image_url = '/products/court-sneaker-detail.jpg' then '/products/basketball-court-low.jpg'
    when p.id = 'sv-015' and p.image_url = '/products/basketball-court-low.jpg' then '/products/retro-court-sneaker.jpg'
    when p.id = 'sv-017' and p.image_url = '/products/everyday-sneaker-white.jpg' then '/products/basketball-court-low.jpg'
    when p.id = 'sv-019' and p.image_url = '/products/court-sneaker-detail.jpg' then '/products/retro-court-sneaker.jpg'
    when p.id = 'sv-021' and p.image_url = '/products/skate-low-top.jpg' then '/products/canvas-sneaker.jpg'
    when p.id = 'sv-022' and p.image_url = '/products/street-court-sneaker.jpg' then '/products/canvas-sneaker.jpg'
    when p.id = 'sv-023' and p.image_url = '/products/basketball-court-low.jpg' then '/products/canvas-sneaker.jpg'
    when p.id = 'sv-025' and p.image_url = '/products/court-sneaker-detail.jpg' then '/products/canvas-sneaker.jpg'
    when p.id = 'sv-026' and p.image_url = '/products/trail-runner.jpg' then '/products/trail-runner-altra.jpg'
    when p.id = 'sv-027' and p.image_url = '/products/training-knit-runner.jpg' then '/products/trail-runner-merrell.jpg'
    when p.id = 'sv-028' and p.image_url = '/products/lightweight-running-shoe.jpg' then '/products/trail-runner-mizuno.jpg'
    when p.id = 'sv-029' and p.image_url = '/products/aero-runner-red.jpg' then '/products/trail-runner-newbalance.jpg'
    when p.id = 'sv-030' and p.image_url = '/products/flex-trainer.jpg' then '/products/trail-runner-altra.jpg'
    when p.id = 'sv-031' and p.image_url = '/products/street-court-sneaker.jpg' then '/products/formal-dress-shoe-01.jpg'
    when p.id = 'sv-032' and p.image_url = '/products/retro-court-sneaker.jpg' then '/products/formal-dress-shoe-02.jpg'
    when p.id = 'sv-033' and p.image_url = '/products/everyday-sneaker-white.jpg' then '/products/formal-dress-shoe-03.jpg'
    when p.id = 'sv-034' and p.image_url = '/products/court-sneaker-detail.jpg' then '/products/formal-dress-shoe-04.jpg'
    when p.id = 'sv-035' and p.image_url = '/products/lightweight-running-shoe.jpg' then '/products/football-boots-gola.jpg'
    when p.id = 'sv-036' and p.image_url = '/products/training-knit-runner.jpg' then '/products/football-boots-nivia.jpg'
    when p.id = 'sv-037' and p.image_url = '/products/flex-trainer.jpg' then '/products/football-boots-inzaghi.jpg'
    when p.id = 'sv-038' and p.image_url = '/products/aero-runner-red.jpg' then '/products/football-boots-baggio.jpg'
    else p.image_url
  end,
  style = case when p.id = 'sv-024' and p.style = 'Low Dunk' then 'Skate Low' else p.style end
where (p.id = 'sv-003' and p.image_url = '/products/basketball-high-top.jpg')
   or (p.id = 'sv-005' and p.image_url = '/products/retro-court-sneaker.jpg')
   or (p.id = 'sv-007' and p.image_url = '/products/basketball-court-low.jpg')
   or (p.id = 'sv-010' and p.image_url = '/products/court-sneaker-detail.jpg')
   or (p.id = 'sv-011' and p.image_url = '/products/retro-court-sneaker.jpg')
   or (p.id = 'sv-013' and p.image_url = '/products/basketball-high-top.jpg')
   or (p.id = 'sv-014' and p.image_url = '/products/court-sneaker-detail.jpg')
   or (p.id = 'sv-015' and p.image_url = '/products/basketball-court-low.jpg')
   or (p.id = 'sv-017' and p.image_url = '/products/everyday-sneaker-white.jpg')
   or (p.id = 'sv-019' and p.image_url = '/products/court-sneaker-detail.jpg')
   or (p.id = 'sv-021' and p.image_url = '/products/skate-low-top.jpg')
   or (p.id = 'sv-022' and p.image_url = '/products/street-court-sneaker.jpg')
   or (p.id = 'sv-023' and p.image_url = '/products/basketball-court-low.jpg')
   or (p.id = 'sv-025' and p.image_url = '/products/court-sneaker-detail.jpg')
   or (p.id = 'sv-026' and p.image_url = '/products/trail-runner.jpg')
   or (p.id = 'sv-027' and p.image_url = '/products/training-knit-runner.jpg')
   or (p.id = 'sv-028' and p.image_url = '/products/lightweight-running-shoe.jpg')
   or (p.id = 'sv-029' and p.image_url = '/products/aero-runner-red.jpg')
   or (p.id = 'sv-030' and p.image_url = '/products/flex-trainer.jpg')
   or (p.id = 'sv-031' and p.image_url = '/products/street-court-sneaker.jpg')
   or (p.id = 'sv-032' and p.image_url = '/products/retro-court-sneaker.jpg')
   or (p.id = 'sv-033' and p.image_url = '/products/everyday-sneaker-white.jpg')
   or (p.id = 'sv-034' and p.image_url = '/products/court-sneaker-detail.jpg')
   or (p.id = 'sv-035' and p.image_url = '/products/lightweight-running-shoe.jpg')
   or (p.id = 'sv-036' and p.image_url = '/products/training-knit-runner.jpg')
   or (p.id = 'sv-037' and p.image_url = '/products/flex-trainer.jpg')
   or (p.id = 'sv-038' and p.image_url = '/products/aero-runner-red.jpg')
   or (p.id = 'sv-024' and p.style = 'Low Dunk');
