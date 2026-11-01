import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SmartImage from './SmartImage.jsx'
import { cn } from '../utils/cn.js'

// Caption strip colours for the three "strip" styles. The 'overlay' style puts text on the photo.
const stripStyles = {
  white: 'bg-surface text-ink',
  lime: 'bg-lime text-ink',
  dark: 'bg-ink text-white',
}

// A category tile that links to /shop?category=<id>.
// `className` lets the homepage give each tile a different size in the grid.
export default function CategoryCard({ category, className }) {
  const { id, label, tagline, image, cardStyle } = category
  const isOverlay = cardStyle === 'overlay'

  return (
    <Link
      to={`/shop?category=${id}`}
      aria-label={`Shop ${label}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line shadow-soft transition-shadow duration-300 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative min-h-64 flex-1">
        <div className="absolute inset-0">
          <SmartImage
            image={image}
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>

        {isOverlay && (
          <>
            <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/10 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
              <div>
                <p className="eyebrow text-lime">{tagline}</p>
                <h3 className="mt-2 text-4xl">{label}</h3>
              </div>
              <ArrowUpRight
                aria-hidden="true"
                className="shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
              />
            </div>
          </>
        )}
      </div>

      {!isOverlay && (
        <div className={cn('flex items-end justify-between p-5', stripStyles[cardStyle] ?? stripStyles.white)}>
          <div>
            <p className="eyebrow opacity-70">{tagline}</p>
            <h3 className="mt-2 text-3xl">{label}</h3>
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
          />
        </div>
      )}
    </Link>
  )
}
