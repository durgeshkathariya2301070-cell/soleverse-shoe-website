// Product category data. Images are local, licensed product photography in /public/products.

export const categories = [
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    tagline: 'Easy pairs for ordinary days.',
    cardStyle: 'white',
    image: { src: '/products/everyday-sneaker-white.jpg', alt: 'White lifestyle sneaker' },
  },
  {
    id: 'running',
    label: 'Running',
    tagline: 'Forward motion, every day.',
    cardStyle: 'overlay',
    image: { src: '/products/lightweight-running-shoe.jpg', alt: 'Lightweight running sneaker' },
  },
  {
    id: 'sports',
    label: 'Sports',
    tagline: 'Find your footing on court and field.',
    cardStyle: 'lime',
    image: { src: '/products/retro-court-sneaker.jpg', alt: 'High-top basketball-inspired court shoes' },
  },
  {
    id: 'casual',
    label: 'Casual',
    tagline: 'Comfort built into the everyday.',
    cardStyle: 'dark',
    image: { src: '/products/retro-court-sneaker.jpg', alt: 'Casual court-style sneaker' },
  },
  {
    id: 'skate',
    label: 'Skate',
    tagline: 'Grip, board feel, repeat.',
    cardStyle: 'white',
    image: { src: '/products/canvas-sneaker.jpg', alt: 'Flat-soled canvas skate sneaker' },
  },
  {
    id: 'trail',
    label: 'Trail',
    tagline: 'Take the longer way out.',
    cardStyle: 'overlay',
    image: { src: '/products/trail-runner-altra.jpg', alt: 'Rugged trail-running shoes' },
  },
  {
    id: 'formal',
    label: 'Formal',
    tagline: 'A polished finish for every occasion.',
    cardStyle: 'dark',
    image: { src: '/products/formal-dress-shoe-01.jpg', alt: 'Black leather formal dress shoes' },
  },
]

export function getCategoryById(id) {
  return categories.find((category) => category.id === id) ?? null
}

export function getCategoryLabel(id) {
  return getCategoryById(id)?.label ?? String(id ?? 'Sneakers').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
