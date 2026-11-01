import { Link } from 'react-router-dom'
import SmartImage from './SmartImage.jsx'
import { getCategoryLabel } from '../data/categories.js'
import { isSoldOut } from '../data/products.js'
import { formatPrice } from '../utils/formatPrice.js'

// One product tile. The whole card is a single link to the product detail page.
// A sale price is shown only when the sample data has an originalPrice.
export default function ProductCard({ product }) {
  const { slug, name, category, brand, price, originalPrice, badge, images } = product
  const onSale = typeof originalPrice === 'number' && originalPrice > price
  const soldOut = isSoldOut(product)
  const badgeText = soldOut ? 'SOLD OUT' : (badge ?? (onSale ? 'SALE' : null))

  return (
    <Link
      to={`/product/${slug}`}
      className="group block rounded-[var(--radius-card)] focus-visible:outline-offset-4"
    >
      <article>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <SmartImage
            image={images[0]}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${soldOut ? 'opacity-60 grayscale' : ''}`}
          />
          {badgeText && (
            <span
              className={`eyebrow absolute left-3 top-3 rounded-full px-2.5 py-1 ${soldOut ? 'bg-ink text-white' : 'bg-lime text-ink'}`}
            >
              {badgeText}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-muted">{brand ? `${brand} · ` : ''}{getCategoryLabel(category)}</p>
            <h3 className="mt-1.5 text-xl leading-none transition-colors group-hover:underline group-hover:underline-offset-4">
              {name}
            </h3>
          </div>
          <p className="shrink-0 text-right">
            <span className="block text-base font-semibold">{formatPrice(price)}</span>
            {onSale && (
              <span className="block text-xs text-muted line-through">
                <span className="sr-only">Original price </span>
                {formatPrice(originalPrice)}
              </span>
            )}
          </p>
        </div>
        <p className="eyebrow mt-3 text-ink/70 underline decoration-ink/30 underline-offset-[6px] group-hover:decoration-ink">
          View details
        </p>
      </article>
    </Link>
  )
}
