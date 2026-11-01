// Large editorial photos used outside the product grid (hero, dark section, About page...).
// Kept here so image URLs are not scattered through the components.
// Same format as the product images — see src/utils/images.js.
// DEMONSTRATION CONTENT: replace with your own brand photography before launch.

export const siteImages = {
  hero: {
    unsplashId: '1542291026-7eec264c27ff',
    fallbackSrc: '/products/aero-runner-red.jpg',
    alt: 'A sneaker from the SOLEVERSE sample collection',
  },
  signature: {
    unsplashId: '1552346154-21d32810aba3',
    fallbackSrc: '/products/basketball-high-top.jpg',
    alt: 'A sneaker shown in the SOLEVERSE signature section',
  },
  editorial: {
    unsplashId: '1606107557195-0e29a4b5b4aa',
    fallbackSrc: '/products/retro-court-sneaker.jpg',
    alt: 'A featured sneaker from the new arrivals edit',
  },
  about: {
    unsplashId: '1556906781-9a412961c28c',
    fallbackSrc: '/products/street-court-sneaker.jpg',
    alt: 'A pair of sneakers from the SOLEVERSE sample collection',
  },
}
