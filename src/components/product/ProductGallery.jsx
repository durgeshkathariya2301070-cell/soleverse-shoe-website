import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SmartImage from '../SmartImage.jsx'
import { cn } from '../../utils/cn.js'

// Large main image + thumbnail strip + previous/next buttons.
// The parent gives this component a `key` of the product slug, so it starts at image 1
// whenever a different product is opened.
export default function ProductGallery({ images, productName }) {
  const [index, setIndex] = useState(0)
  const total = images.length
  const current = images[index]

  const goTo = (next) => setIndex((next + total) % total) // wraps around at both ends

  return (
    <section aria-label={`${productName} image gallery`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface sm:aspect-square">
        {/* key makes the image reload cleanly (with its own fallback) when the selection changes */}
        <SmartImage
          key={index}
          image={current}
          priority={index === 0}
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover"
        />

        <span className="eyebrow absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1.5 text-ink shadow-soft">
          {current.label}
        </span>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-soft transition-colors hover:bg-lime"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-soft transition-colors hover:bg-lime"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-muted" aria-live="polite">
        Image {index + 1} of {total}.
      </p>

      {total > 1 && (
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {images.map((image, imageIndex) => (
            <li key={`${image.src}-${imageIndex}`} className="w-24 shrink-0 sm:w-28">
              <button
                type="button"
                onClick={() => setIndex(imageIndex)}
                aria-label={`Show image ${imageIndex + 1}: ${image.label}`}
                aria-current={imageIndex === index ? 'true' : undefined}
                className={cn(
                  'block aspect-[4/3] w-full overflow-hidden rounded-lg border bg-surface transition-colors',
                  imageIndex === index ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-ink/50',
                )}
              >
                <SmartImage image={image} sizes="160px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
