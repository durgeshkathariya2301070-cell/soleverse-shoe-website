// Turns an image entry from our data files into <img> attributes.
//
// An image entry looks like one of these:
//   { unsplashId: '1542291026-7eec264c27ff', alt: '...' }   -> photo hosted on Unsplash's CDN
//   { src: '/images/my-shoe.jpg', alt: '...' }              -> a local file placed in /public/images
//
// Keeping this logic in one place means image URLs never get scattered across components.

const UNSPLASH_CDN = 'https://images.unsplash.com'
const DEFAULT_WIDTHS = [480, 800, 1200]

export function getImageSources(image, widths = DEFAULT_WIDTHS) {
  if (!image) return { src: null, srcSet: undefined }

  if (typeof image === 'string') {
    return { src: image, srcSet: undefined }
  }

  if (image.src) {
    return { src: image.src, srcSet: undefined }
  }

  if (image.unsplashId) {
    const build = (width) =>
      `${UNSPLASH_CDN}/photo-${image.unsplashId}?auto=format&fit=crop&q=80&w=${width}`
    const middleWidth = widths[Math.floor(widths.length / 2)]
    return {
      src: build(middleWidth),
      srcSet: widths.map((width) => `${build(width)} ${width}w`).join(', '),
    }
  }

  return { src: null, srcSet: undefined }
}
