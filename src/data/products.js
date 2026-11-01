// Catalogue preview data. Prices and stock remain demonstration values until managed in Supabase.
//
// Every product uses the same shape:
//   id, slug (used in the URL), name, category (matches an id in categories.js),
//   price (number, rupees), originalPrice (number or null),
//   badge ('NEW' | 'FEATURED' | null; 'SALE' is added automatically when originalPrice is set),
//   featured (shown on the homepage), shortDescription, description,
//   images          -> gallery images (first one is the main image used on cards)
//   availableSizes  -> UK / India sizes shown on the product page
//   availableColors -> [{ id, label, hex }]
//   stockByVariant  -> { colorId: { size: unitsInSampleStock } }. A missing size means 0.
//
// OPTIONAL 3D fields (a product without them simply shows its photo gallery):
//   supports3D            -> true when this product has its own 3D model
//   modelPath             -> where the .glb file lives, e.g. '/models/sneaker.glb' (file in /public/models)
//   modelRotation         -> optional [x, y, z] rotation in radians, to turn a model that faces the wrong way
//   customizableMaterials -> parts of the model that can be recoloured in the viewer:
//                            [{ id, label, materialName }]. materialName must match the material name
//                            INSIDE the .glb file. Parts missing from the model are never offered.
// No model file ships with this project. Add your own licensed sneaker model (see public/models/README.md).
//
// Local product photography is stored in /public/products; see SOURCES.txt in that folder.

// Sample products show one real source photo until verified alternate views are available.
function galleryFrom(src, productName) {
  return [{ src, alt: `${productName}, sneaker product photo`, label: 'Main view' }]
}

// Colour swatches reused across products.
const colors = {
  black: { id: 'black', label: 'Core Black', hex: '#171717' },
  white: { id: 'white', label: 'Cloud White', hex: '#F2F2EE' },
  lime: { id: 'lime', label: 'Volt Lime', hex: '#D9FF64' },
  grey: { id: 'grey', label: 'Stone Grey', hex: '#A3A39C' },
  red: { id: 'red', label: 'Signal Red', hex: '#D7382D' },
  blue: { id: 'blue', label: 'Deep Blue', hex: '#26407A' },
  sand: { id: 'sand', label: 'Warm Sand', hex: '#C8B99B' },
  forest: { id: 'forest', label: 'Forest Green', hex: '#315B42' },
  orange: { id: 'orange', label: 'Ember Orange', hex: '#D96B32' },
  navy: { id: 'navy', label: 'Midnight Navy', hex: '#26334F' },
}

const standardSizes = [6, 7, 8, 9, 10, 11]

function makeProduct({ id, slug, name, category, price, shortDescription, description, image, colorIds, featured = false }) {
  const [firstColor, secondColor] = colorIds.map((colorId) => colors[colorId])
  return {
    id,
    slug,
    name,
    category,
    price,
    originalPrice: null,
    badge: featured ? 'NEW' : null,
    featured,
    shortDescription,
    description,
    images: galleryFrom(`/products/${image}`, name),
    availableSizes: standardSizes,
    availableColors: [firstColor, secondColor],
    stockByVariant: {
      [firstColor.id]: { 6: 2, 7: 3, 8: 0 },
      [secondColor.id]: { 9: 2, 10: 3, 11: 1 },
    },
  }
}

const productMetadata = {
  'aero-runner-01': { brand: 'Nike', style: 'Road Runner' },
  'stride-mono': { brand: 'Adidas', style: 'Low Top' },
  'vertex-high': { brand: 'Jordan', sport: 'basketball', style: 'High Top' },
  'pulse-trainer': { brand: 'Nike', style: 'Training' },
  'drift-low': { brand: 'Nike', style: 'Low Dunk' },
  'sprint-lite': { brand: 'Adidas', style: 'Road Runner' },
  'block-court': { brand: 'Converse', sport: 'basketball', style: 'Low Top' },
  'core-flex': { brand: 'Adidas', style: 'Training' },
  'terrace-form': { brand: 'Jordan', style: 'Low Dunk' },
  'weekender-knit': { brand: 'Converse', style: 'Knit' },
  'studio-court': { brand: 'Nike', style: 'Low Dunk' },
  'stride-tempo': { brand: 'Adidas', style: 'Road Runner' },
  'baseline-rise': { brand: 'Jordan', sport: 'basketball', style: 'High Top' },
  'arc-drive': { brand: 'Nike', sport: 'basketball', style: 'Court' },
  'paintline-mid': { brand: 'Converse', sport: 'basketball', style: 'Mid Top' },
  'harbor-canvas': { brand: 'Converse', style: 'Canvas' },
  'northline-cup': { brand: 'Nike', style: 'Low Dunk' },
  'daybreak-suede': { brand: 'Adidas', style: 'Suede' },
  'field-note-low': { brand: 'Nike', style: 'Low Dunk' },
  'everyday-pacer': { brand: 'Adidas', style: 'Trainer' },
  'curbside-canvas': { brand: 'Converse', style: 'Canvas' },
  'switchback-suede': { brand: 'Jordan', style: 'Suede' },
  'rail-yard-mid': { brand: 'Converse', style: 'Mid Top' },
  'gripline-low': { brand: 'Nike', style: 'Low Dunk' },
  'alley-track': { brand: 'Adidas', style: 'Low Top' },
  'ridgepath-1': { brand: 'Adidas', style: 'Trail Runner' },
  'granite-loop': { brand: 'Nike', style: 'Trail Runner' },
  'wildline-crest': { brand: 'Jordan', style: 'Trail Runner' },
  'earthbound-pace': { brand: 'Converse', style: 'Trail Runner' },
  'summit-mesh': { brand: 'Adidas', style: 'Trail Runner' },
  'meridian-derby': { brand: 'Nike', style: 'Formal' },
  'atelier-oxford': { brand: 'Adidas', style: 'Formal' },
  'evening-line': { brand: 'Jordan', style: 'Formal' },
  'city-polish': { brand: 'Converse', style: 'Formal' },
  'touchline-grip': { brand: 'Nike', sport: 'football', style: 'Football' },
  'matchday-rapid': { brand: 'Adidas', sport: 'football', style: 'Football' },
  'pitch-control': { brand: 'Jordan', sport: 'football', style: 'Football' },
  'wingback-flex': { brand: 'Converse', sport: 'football', style: 'Football' },
  'crease-ready': { brand: 'Nike', sport: 'cricket', style: 'Cricket' },
  'boundary-runner': { brand: 'Adidas', sport: 'cricket', style: 'Cricket' },
  'powerplay-stud': { brand: 'Jordan', sport: 'cricket', style: 'Cricket' },
  'all-rounder-pro': { brand: 'Converse', sport: 'cricket', style: 'Cricket' },
}

const additionalProducts = [
  {
    id: 'sv-031', slug: 'meridian-derby', name: 'Meridian Derby', category: 'formal', price: 6999,
    shortDescription: 'A sleek, understated profile for polished occasions.',
    description: 'Meridian Derby pairs a smooth, structured upper with a clean low-profile sole and cushioned footbed. Its restrained silhouette brings a smart finish to workdays and evening plans.',
    image: 'street-court-sneaker.jpg', colorIds: ['black', 'navy'],
  },
  {
    id: 'sv-032', slug: 'atelier-oxford', name: 'Atelier Oxford', category: 'formal', price: 7499,
    shortDescription: 'A refined lace-up with soft support for long days.',
    description: 'A neat lace-up profile, padded collar and flexible outsole give Atelier Oxford a comfortable, composed feel. Subtle panel details keep the design versatile for formal and smart-casual dressing.',
    image: 'retro-court-sneaker.jpg', colorIds: ['black', 'grey'],
  },
  {
    id: 'sv-033', slug: 'evening-line', name: 'Evening Line', category: 'formal', price: 8299,
    shortDescription: 'Clean lines and a cushioned step after hours.',
    description: 'Evening Line combines a minimal dark upper with discreet stitching and a supportive footbed. The light, flexible construction makes it easy to wear from office hours to dinner.',
    image: 'everyday-sneaker-white.jpg', colorIds: ['black', 'navy'],
  },
  {
    id: 'sv-034', slug: 'city-polish', name: 'City Polish', category: 'formal', price: 6499,
    shortDescription: 'A modern dress-casual shoe built for city commutes.',
    description: 'City Polish balances a tidy, polished shape with a cushioned insole and grippy rubber outsole. A soft lining and flexible sole help keep each step comfortable throughout the day.',
    image: 'court-sneaker-detail.jpg', colorIds: ['black', 'sand'],
  },
  {
    id: 'sv-035', slug: 'touchline-grip', name: 'Touchline Grip', category: 'sports', price: 5999,
    shortDescription: 'A secure, flexible sports shoe for football training.',
    description: 'Touchline Grip has a close-fitting upper, reinforced toe and grippy outsole for quick movement through training drills. Its supportive shape is designed for comfort during practice and warm-ups.',
    image: 'lightweight-running-shoe.jpg', colorIds: ['black', 'lime'],
  },
  {
    id: 'sv-036', slug: 'matchday-rapid', name: 'Matchday Rapid', category: 'sports', price: 7499,
    shortDescription: 'Lightweight support for fast football sessions.',
    description: 'A breathable upper and stable midfoot wrap help Matchday Rapid feel secure through changes of pace. Flexible forefoot grooves support quick steps in training and recreational play.',
    image: 'training-knit-runner.jpg', colorIds: ['blue', 'orange'],
  },
  {
    id: 'sv-037', slug: 'pitch-control', name: 'Pitch Control', category: 'sports', price: 6799,
    shortDescription: 'Responsive cushioning for football practice.',
    description: 'Pitch Control combines a padded heel, durable overlays and a lightweight cushioned base for repeated training sessions. A textured outsole provides dependable grip on suitable playing surfaces.',
    image: 'flex-trainer.jpg', colorIds: ['forest', 'black'],
  },
  {
    id: 'sv-038', slug: 'wingback-flex', name: 'Wingback Flex', category: 'sports', price: 6299,
    shortDescription: 'A flexible training shoe for quick football footwork.',
    description: 'Wingback Flex uses a close, supportive fit and a durable rubber outsole to stay comfortable during drills. The lightweight build and padded tongue make it a versatile practice-day option.',
    image: 'aero-runner-red.jpg', colorIds: ['red', 'white'],
  },
  {
    id: 'sv-039', slug: 'crease-ready', name: 'Crease Ready', category: 'sports', price: 6199,
    shortDescription: 'Stable comfort for cricket training and fielding.',
    description: 'Crease Ready features a secure heel, cushioned midsole and robust outsole for comfortable movement through practice and fielding drills. Breathable panels help keep the fit fresh.',
    image: 'training-knit-runner.jpg', colorIds: ['white', 'blue'],
  },
  {
    id: 'sv-040', slug: 'boundary-runner', name: 'Boundary Runner', category: 'sports', price: 7199,
    shortDescription: 'Supportive cushioning for long cricket sessions.',
    description: 'Boundary Runner balances a breathable upper with a stable platform and durable tread. A padded collar and responsive cushioning support repeated running and movement during cricket practice.',
    image: 'lightweight-running-shoe.jpg', colorIds: ['lime', 'navy'],
  },
  {
    id: 'sv-041', slug: 'powerplay-stud', name: 'Powerplay Stud', category: 'sports', price: 7899,
    shortDescription: 'A secure sports profile for cricket drills.',
    description: 'Powerplay Stud offers a reinforced upper, comfortable ankle padding and a grippy outsole for training-day confidence. Its supportive fit helps with quick starts and repeated movement.',
    image: 'flex-trainer.jpg', colorIds: ['black', 'orange'],
  },
  {
    id: 'sv-042', slug: 'all-rounder-pro', name: 'All-Rounder Pro', category: 'sports', price: 6899,
    shortDescription: 'Versatile cushioning for cricket practice and warm-ups.',
    description: 'All-Rounder Pro combines a breathable mesh upper, stable heel and flexible sole for all-day comfort around training. The durable construction is suited to warm-ups and general practice.',
    image: 'aero-runner-red.jpg', colorIds: ['grey', 'forest'],
  },
]

const productImageOverrides = {
  'sv-003': 'skate-low-top.jpg',
  'sv-005': 'court-sneaker-detail.jpg',
  'sv-010': 'training-knit-runner.jpg',
  'sv-011': 'basketball-court-low.jpg',
  'sv-013': 'retro-court-sneaker.jpg',
  'sv-014': 'basketball-court-low.jpg',
  'sv-015': 'retro-court-sneaker.jpg',
  'sv-007': 'street-court-sneaker.jpg',
  'sv-017': 'basketball-court-low.jpg',
  'sv-019': 'retro-court-sneaker.jpg',
  'sv-021': 'canvas-sneaker.jpg',
  'sv-022': 'canvas-sneaker.jpg',
  'sv-023': 'canvas-sneaker.jpg',
  'sv-024': 'canvas-sneaker.jpg',
  'sv-025': 'canvas-sneaker.jpg',
  'sv-026': 'trail-runner-altra.jpg',
  'sv-027': 'trail-runner-merrell.jpg',
  'sv-028': 'trail-runner-mizuno.jpg',
  'sv-029': 'trail-runner-newbalance.jpg',
  'sv-030': 'trail-runner-altra.jpg',
  'sv-031': 'formal-dress-shoe-01.jpg',
  'sv-032': 'formal-dress-shoe-02.jpg',
  'sv-033': 'formal-dress-shoe-03.jpg',
  'sv-034': 'formal-dress-shoe-04.jpg',
  'sv-035': 'football-boots-gola.jpg',
  'sv-036': 'football-boots-nivia.jpg',
  'sv-037': 'football-boots-inzaghi.jpg',
  'sv-038': 'football-boots-baggio.jpg',
  // Cricket: no dedicated cricket-spike photos exist locally; these general sports trainers
  // are the closest available match and are accepted as partial matches in IMAGE_AUDIT.md.
  'sv-039': 'flex-trainer.jpg',
  'sv-040': 'lightweight-running-shoe.jpg',
  'sv-041': 'training-knit-runner.jpg',
  'sv-042': 'aero-runner-red.jpg',
}

export const products = [
  {
    id: 'sv-001',
    slug: 'aero-runner-01',
    name: 'Aero Runner 01',
    category: 'running',
    price: 6999,
    originalPrice: null,
    badge: 'NEW',
    featured: true,
    shortDescription: 'A low-profile runner with a clean, minimal upper.',
    description:
      'Built for daily miles and changing pace, the Aero Runner 01 pairs a breathable mesh upper with a cushioned midsole and a stable, grippy outsole. Its streamlined shape keeps the ride light from warm-up to cooldown.',
    images: galleryFrom('/products/aero-runner-red.jpg', 'Aero Runner 01'),
    // 3D: only this product is set up for a model. Until public/models/sneaker.glb exists, the page
    // shows the photo gallery and a "3D not available" note. Rename the materials to match your model.
    supports3D: true,
    modelPath: '/models/sneaker.glb',
    modelRotation: [0, 0, 0],
    customizableMaterials: [
      { id: 'upper', label: 'Upper', materialName: 'upper' },
      { id: 'sole', label: 'Sole', materialName: 'sole' },
      { id: 'laces', label: 'Laces', materialName: 'laces' },
    ],
    availableSizes: [6, 7, 8, 9, 10, 11],
    availableColors: [colors.black, colors.lime, colors.white],
    stockByVariant: {
      black: { 6: 2, 7: 4, 8: 6, 9: 3, 10: 0, 11: 1 },
      lime: { 7: 3, 8: 2, 10: 4 },
      white: { 6: 1, 8: 5, 9: 4, 11: 2 },
    },
  },
  {
    id: 'sv-002',
    slug: 'stride-mono',
    name: 'Stride Mono',
    category: 'lifestyle',
    price: 5499,
    originalPrice: 6499,
    badge: null,
    featured: true,
    shortDescription: 'A relaxed everyday sneaker in a single tone.',
    description:
      'A clean everyday profile with a soft padded collar, easy-wearing cushioning and a tonal finish. The Stride Mono is designed to move comfortably between a morning commute and a late afternoon walk.',
    images: galleryFrom('/products/everyday-sneaker-white.jpg', 'Stride Mono'),
    availableSizes: [6, 7, 8, 9, 10],
    availableColors: [colors.grey, colors.black],
    stockByVariant: {
      grey: { 6: 3, 7: 2, 8: 0, 9: 5, 10: 4 },
      black: { 7: 1, 8: 4, 9: 2 },
    },
  },
  {
    id: 'sv-003',
    slug: 'vertex-high',
    name: 'Vertex High',
    category: 'sports',
    price: 7999,
    originalPrice: null,
    badge: 'NEW',
    featured: true,
    shortDescription: 'A high-top built to stand out on the street.',
    description:
      'The Vertex High brings ankle coverage and a confident court-inspired shape together with a padded tongue and cushioned footbed. A grippy rubber tread keeps the classic high-top ready for all-day wear.',
    images: galleryFrom('/products/basketball-high-top.jpg', 'Vertex High'),
    availableSizes: [7, 8, 9, 10, 11],
    availableColors: [colors.black, colors.red, colors.white],
    stockByVariant: {
      black: { 7: 2, 8: 3, 9: 5, 10: 2, 11: 1 },
      red: { 8: 2, 9: 3, 10: 0 },
      white: { 7: 1, 9: 2, 11: 3 },
    },
  },
  {
    id: 'sv-004',
    slug: 'pulse-trainer',
    name: 'Pulse Trainer',
    category: 'running',
    price: 4999,
    originalPrice: null,
    badge: 'FEATURED',
    featured: true,
    shortDescription: 'A supportive trainer shape for gym sessions.',
    description:
      'A versatile daily trainer with a breathable engineered upper, supportive heel counter and resilient cushioning. The Pulse Trainer balances a secure fit with a smooth transition for steady road sessions.',
    images: galleryFrom('/products/training-knit-runner.jpg', 'Pulse Trainer'),
    availableSizes: [6, 7, 8, 9, 10, 11],
    availableColors: [colors.blue, colors.grey],
    stockByVariant: {
      blue: { 6: 4, 7: 5, 8: 3, 9: 2, 10: 3, 11: 0 },
      grey: { 7: 2, 8: 4, 9: 3, 10: 1 },
    },
  },
  {
    id: 'sv-005',
    slug: 'drift-low',
    name: 'Drift Low',
    category: 'lifestyle',
    price: 5999,
    originalPrice: null,
    badge: null,
    featured: false,
    shortDescription: 'A low-cut everyday pair with simple lines.',
    description:
      'The Drift Low keeps its lines simple with a low-cut profile, cushioned insole and durable rubber outsole. Soft neutral panels make this an easy everyday pair to style across the week.',
    images: galleryFrom('/products/retro-court-sneaker.jpg', 'Drift Low'),
    availableSizes: [6, 7, 8, 9, 10],
    availableColors: [colors.white, colors.black],
    stockByVariant: {
      white: { 6: 2, 7: 3, 8: 4, 9: 2, 10: 1 },
      black: { 7: 2, 8: 2, 9: 3 },
    },
  },
  {
    id: 'sv-006',
    slug: 'sprint-lite',
    name: 'Sprint Lite',
    category: 'running',
    price: 4499,
    originalPrice: 5999,
    badge: null,
    featured: false,
    shortDescription: 'A light, fast-looking runner.',
    description:
      'Made for light, uncomplicated runs, Sprint Lite combines an airy upper with responsive cushioning and flexible forefoot grooves. Its low-weight build feels comfortable for short loops and everyday movement.',
    images: galleryFrom('/products/lightweight-running-shoe.jpg', 'Sprint Lite'),
    availableSizes: [6, 7, 8, 9, 10, 11],
    availableColors: [colors.lime, colors.grey],
    stockByVariant: {
      lime: { 6: 1, 7: 2, 8: 3, 9: 4, 10: 2 },
      grey: { 8: 2, 9: 0, 10: 3, 11: 2 },
    },
  },
  {
    id: 'sv-007',
    slug: 'block-court',
    name: 'Block Court',
    category: 'sports',
    price: 6499,
    originalPrice: null,
    badge: null,
    featured: false,
    shortDescription: 'A court-inspired shape with a bold profile.',
    description:
      'A low-cut court silhouette built around a supportive cupsole, padded lining and clean panel construction. Block Court pairs a steady underfoot feel with an easy shape for everyday rotation.',
    images: galleryFrom('/products/basketball-court-low.jpg', 'Block Court'),
    availableSizes: [7, 8, 9, 10],
    availableColors: [colors.white, colors.red],
    stockByVariant: {
      white: {},
      red: {},
    },
  },
  {
    id: 'sv-008',
    slug: 'core-flex',
    name: 'Core Flex',
    category: 'running',
    price: 5299,
    originalPrice: null,
    badge: null,
    featured: false,
    shortDescription: 'A versatile trainer for mixed workouts.',
    description:
      'Core Flex is a dependable all-rounder with a flexible forefoot, supportive midfoot wrap and cushioned heel. Its balanced construction suits light training sessions and active days on the go.',
    images: galleryFrom('/products/flex-trainer.jpg', 'Core Flex'),
    availableSizes: [6, 7, 8, 9, 10, 11],
    availableColors: [colors.black, colors.blue],
    stockByVariant: {
      black: { 6: 2, 7: 3, 8: 4, 9: 5, 10: 3, 11: 2 },
      blue: { 7: 1, 8: 2, 9: 2 },
    },
  },
  ...[
    {
      id: 'sv-009', slug: 'terrace-form', name: 'Terrace Form', category: 'lifestyle', price: 5799,
      shortDescription: 'A refined terrace profile with a soft, easy-wearing feel.',
      description: 'Terrace Form pairs a low-profile cupsole with a cushioned footbed and understated panel work. A comfortable lining and versatile shape make it a natural choice for everyday plans.',
      image: 'street-court-sneaker.jpg', colorIds: ['white', 'forest'],
    },
    {
      id: 'sv-010', slug: 'weekender-knit', name: 'Weekender Knit', category: 'lifestyle', price: 6299,
      shortDescription: 'A flexible knit upper for long, unhurried days.',
      description: 'A breathable knit upper gives Weekender Knit a soft, flexible fit, while the supportive midsole adds comfort over long days on your feet. The understated outsole keeps the look relaxed.',
      image: 'court-sneaker-detail.jpg', colorIds: ['grey', 'sand'],
    },
    {
      id: 'sv-011', slug: 'studio-court', name: 'Studio Court', category: 'lifestyle', price: 6899,
      shortDescription: 'A crisp court-inspired sneaker with a cushioned step.',
      description: 'Studio Court takes cues from classic indoor footwear and updates them with a padded collar, smooth layered upper and durable cupsole. A cushioned footbed keeps the profile comfortable through daily wear.',
      image: 'retro-court-sneaker.jpg', colorIds: ['white', 'navy'],
    },
    {
      id: 'sv-012', slug: 'stride-tempo', name: 'Stride Tempo', category: 'running', price: 7499,
      shortDescription: 'Responsive cushioning for steady road sessions.',
      description: 'Stride Tempo combines a breathable engineered mesh upper with a springy, full-length midsole and dependable road traction. The secure heel fit supports a smooth, consistent stride.',
      image: 'aero-runner-red.jpg', colorIds: ['blue', 'lime'], featured: true,
    },
    {
      id: 'sv-013', slug: 'baseline-rise', name: 'Baseline Rise', category: 'sports', price: 8299,
      shortDescription: 'A supportive high-top with a stable court-ready base.',
      description: 'Baseline Rise features a padded high collar, structured overlays and a broad traction pattern for confident cuts. Its cushioned midsole helps absorb impact through quick changes of direction.',
      image: 'basketball-high-top.jpg', colorIds: ['black', 'orange'], featured: true,
    },
    {
      id: 'sv-014', slug: 'arc-drive', name: 'Arc Drive', category: 'sports', price: 8999,
      shortDescription: 'Lock-in support and grip for fast court movement.',
      description: 'A reinforced midfoot cage and secure lacing keep Arc Drive stable during lateral movement. Underfoot cushioning softens landings while the multi-directional rubber tread grips indoor courts.',
      image: 'court-sneaker-detail.jpg', colorIds: ['navy', 'white'],
    },
    {
      id: 'sv-015', slug: 'paintline-mid', name: 'Paintline Mid', category: 'sports', price: 7799,
      shortDescription: 'A padded mid-cut built for comfort beyond the buzzer.',
      description: 'Paintline Mid balances ankle padding with a flexible forefoot and a durable cupsole. A breathable tongue and cushioned heel make it a comfortable option for play and everyday wear.',
      image: 'basketball-court-low.jpg', colorIds: ['red', 'black'],
    },
    {
      id: 'sv-016', slug: 'harbor-canvas', name: 'Harbor Canvas', category: 'casual', price: 3999,
      shortDescription: 'A lightweight canvas low-top with everyday versatility.',
      description: 'Harbor Canvas keeps things simple with a durable woven upper, padded footbed and flexible rubber outsole. The easy low-top shape works from weekend errands to relaxed evenings.',
      image: 'canvas-sneaker.jpg', colorIds: ['white', 'blue'],
    },
    {
      id: 'sv-017', slug: 'northline-cup', name: 'Northline Cup', category: 'casual', price: 4599,
      shortDescription: 'A clean cupsole sneaker with a comfortably padded collar.',
      description: 'Northline Cup pairs a smooth, easy-care upper with a supportive cupsole and soft collar padding. Its restrained profile is built for repeat wear and simple everyday styling.',
      image: 'everyday-sneaker-white.jpg', colorIds: ['black', 'sand'],
    },
    {
      id: 'sv-018', slug: 'daybreak-suede', name: 'Daybreak Suede', category: 'casual', price: 5499,
      shortDescription: 'A soft-touch casual sneaker with a grounded profile.',
      description: 'Daybreak Suede features a layered upper, cushioned insole and flexible outsole for all-day comfort. Low-key colour blocking gives this versatile pair a considered, easygoing finish.',
      image: 'court-sneaker-detail.jpg', colorIds: ['grey', 'forest'],
    },
    {
      id: 'sv-019', slug: 'field-note-low', name: 'Field Note Low', category: 'casual', price: 4299,
      shortDescription: 'A relaxed low-top shaped for daily walks and commutes.',
      description: 'A padded heel, soft lining and flexible sole give Field Note Low a comfortable feel from the first step. Its classic low-top construction is easy to wear through the week.',
      image: 'retro-court-sneaker.jpg', colorIds: ['white', 'red'],
    },
    {
      id: 'sv-020', slug: 'everyday-pacer', name: 'Everyday Pacer', category: 'casual', price: 4999,
      shortDescription: 'A cushioned, breathable pair for days on the move.',
      description: 'Everyday Pacer pairs a lightweight mesh-and-panel upper with a supportive midsole and durable rubber pods. A padded tongue and collar add comfort for longer days out.',
      image: 'training-knit-runner.jpg', colorIds: ['navy', 'grey'],
    },
    {
      id: 'sv-021', slug: 'curbside-canvas', name: 'Curbside Canvas', category: 'skate', price: 4499,
      shortDescription: 'A durable canvas skate shoe with a grippy flat sole.',
      description: 'Curbside Canvas is built around a reinforced toe, padded tongue and sturdy flat outsole for board feel and daily durability. The breathable upper keeps the fit comfortable between sessions.',
      image: 'skate-low-top.jpg', colorIds: ['black', 'white'], featured: true,
    },
    {
      id: 'sv-022', slug: 'switchback-suede', name: 'Switchback Suede', category: 'skate', price: 5299,
      shortDescription: 'A reinforced low-top with a flexible, grippy outsole.',
      description: 'Switchback Suede uses durable overlay panels at high-wear areas, a padded collar and a flexible rubber outsole. Its stable low profile stays comfortable on and off the board.',
      image: 'street-court-sneaker.jpg', colorIds: ['sand', 'forest'],
    },
    {
      id: 'sv-023', slug: 'rail-yard-mid', name: 'Rail Yard Mid', category: 'skate', price: 5899,
      shortDescription: 'A padded mid-top that adds coverage without bulk.',
      description: 'Rail Yard Mid adds ankle coverage with soft padding and a secure lace fit while keeping the sole flexible for board feel. A reinforced toe cap helps it stand up to repeated sessions.',
      image: 'basketball-court-low.jpg', colorIds: ['black', 'orange'],
    },
    {
      id: 'sv-024', slug: 'gripline-low', name: 'Gripline Low', category: 'skate', price: 4799,
      shortDescription: 'A low-profile skate shoe with dependable board feel.',
      description: 'Gripline Low combines a close-to-the-ground shape with a textured rubber outsole and padded heel. The tough upper is designed for frequent wear, while the flexible forefoot stays easy to move in.',
      image: 'canvas-sneaker.jpg', colorIds: ['blue', 'white'],
    },
    {
      id: 'sv-025', slug: 'alley-track', name: 'Alley Track', category: 'skate', price: 5599,
      shortDescription: 'A cushioned skate silhouette with reinforced side panels.',
      description: 'Alley Track pairs reinforced side panels with a padded fit and grippy outsole for stability through everyday skating. Subtle colour accents give its durable build a distinctive finish.',
      image: 'court-sneaker-detail.jpg', colorIds: ['red', 'navy'],
    },
    {
      id: 'sv-026', slug: 'ridgepath-1', name: 'Ridgepath 1', category: 'trail', price: 7999,
      shortDescription: 'A rugged trail runner with a secure, breathable upper.',
      description: 'Ridgepath 1 is designed for mixed terrain with a protective toe bumper, supportive heel and multi-directional outsole lugs. The breathable upper helps keep the fit comfortable on longer routes.',
      image: 'trail-runner.jpg', colorIds: ['forest', 'orange'], featured: true,
    },
    {
      id: 'sv-027', slug: 'granite-loop', name: 'Granite Loop', category: 'trail', price: 8499,
      shortDescription: 'Confident traction and cushioning for changing ground.',
      description: 'Granite Loop brings a stable platform, cushioned midsole and grippy lug pattern together for park paths and rocky tracks. A reinforced toe and secure lace structure help protect and hold the foot.',
      image: 'training-knit-runner.jpg', colorIds: ['grey', 'lime'],
    },
    {
      id: 'sv-028', slug: 'wildline-crest', name: 'Wildline Crest', category: 'trail', price: 9299,
      shortDescription: 'Protective trail comfort with a steady, sure-footed ride.',
      description: 'Wildline Crest uses a supportive upper, protective toe wrap and high-traction outsole for uneven routes. Balanced cushioning and a secure heel make it a dependable companion for trail days.',
      image: 'lightweight-running-shoe.jpg', colorIds: ['black', 'forest'],
    },
    {
      id: 'sv-029', slug: 'earthbound-pace', name: 'Earthbound Pace', category: 'trail', price: 7499,
      shortDescription: 'A versatile off-road runner with a flexible lugged sole.',
      description: 'Earthbound Pace blends a lightweight build with a grippy outsole and abrasion-resistant overlays. Its flexible ride suits a mix of compact trails, gravel paths and everyday outdoor miles.',
      image: 'aero-runner-red.jpg', colorIds: ['orange', 'navy'],
    },
    {
      id: 'sv-030', slug: 'summit-mesh', name: 'Summit Mesh', category: 'trail', price: 8999,
      shortDescription: 'Breathable trail support for long days outside.',
      description: 'Summit Mesh pairs an airy upper with a reinforced toe, supportive midsole and durable traction lugs. A secure fit and cushioned ride help you stay comfortable across changing terrain.',
      image: 'flex-trainer.jpg', colorIds: ['blue', 'sand'],
    },
  ].map(makeProduct),
  ...additionalProducts.map(makeProduct),
].map((product) => ({
  ...product,
  ...(productImageOverrides[product.id]
    ? { images: galleryFrom(`/products/${productImageOverrides[product.id]}`, product.name) }
    : {}),
  ...productMetadata[product.slug],
  ...(product.id === 'sv-024' ? { style: 'Skate Low' } : {}),
}))

const PRODUCTS_NEEDING_REVIEW = new Set([
  'sv-013', 'sv-014', 'sv-015', 'sv-018',
  'sv-022', 'sv-023', 'sv-024', 'sv-025',
  'sv-030', 'sv-031', 'sv-032', 'sv-033', 'sv-034', 'sv-038',
  'sv-039', 'sv-040', 'sv-041', 'sv-042',
])

export const publicSampleProducts = products
  .filter((product) => !PRODUCTS_NEEDING_REVIEW.has(product.id))
  .map((product) => ({ ...product, brand: '' }))

// ---- Lookup helpers -------------------------------------------------------

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug) ?? null
}

export function getProductsByCategory(categoryId) {
  return products.filter((product) => product.category === categoryId)
}

export function getFeaturedProducts() {
  return products.filter((product) => product.featured)
}

// Other products to suggest on a product page: same category first, then the rest.
export function getRelatedProducts(slug, limit = 4) {
  const current = getProductBySlug(slug)
  if (!current) return []
  const others = products.filter((product) => product.slug !== slug)
  const sameCategory = others.filter((product) => product.category === current.category)
  const rest = others.filter((product) => product.category !== current.category)
  return [...sameCategory, ...rest].slice(0, limit)
}

// True only when a product has declared its own 3D model.
export function has3DModel(product) {
  return product.supports3D === true && typeof product.modelPath === 'string' && product.modelPath.length > 0
}

// ---- Availability helpers (sample stock) ----------------------------------

// Units in sample stock for one colour + size. Unknown combinations count as 0.
export function getStock(product, colorId, size) {
  return product.stockByVariant?.[colorId]?.[size] ?? 0
}

// Sizes that are in sample stock for a colour.
export function getAvailableSizes(product, colorId) {
  return product.availableSizes.filter((size) => getStock(product, colorId, size) > 0)
}

// A colour is available when at least one of its sizes is in sample stock.
export function isColorAvailable(product, colorId) {
  return getAvailableSizes(product, colorId).length > 0
}

// A product is sold out when none of its colours has any size in sample stock.
export function isSoldOut(product) {
  return !product.availableColors.some((color) => isColorAvailable(product, color.id))
}
