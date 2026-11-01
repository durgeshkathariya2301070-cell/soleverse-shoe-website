import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductCard from '../ProductCard.jsx'
import SectionHeading from '../SectionHeading.jsx'
import { useCatalogue } from '../../context/CatalogueContext.jsx'

export default function FeaturedCollection() {
  const { products, status } = useCatalogue()
  const featured = products.filter((product) => product.featured).slice(0, 4)

  return (
    <section aria-labelledby="featured-heading" className="container-page py-16 md:py-24">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <SectionHeading
          id="featured-heading"
          eyebrow="02 — Featured collection"
          title={
            <>
              Fresh finds.
              <br />
              New energy.
            </>
          }
        />
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-[0.1em] underline underline-offset-[6px] hover:gap-3 sm:self-auto"
        >
          View all <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {status === 'loading' ? (
        <p className="mt-12 text-sm text-muted" role="status">Loading the collection…</p>
      ) : (
      <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
      )}
    </section>
  )
}
