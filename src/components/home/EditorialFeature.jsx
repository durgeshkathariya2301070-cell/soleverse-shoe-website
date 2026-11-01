import Button from '../Button.jsx'
import SmartImage from '../SmartImage.jsx'
import { siteImages } from '../../data/siteImages.js'
import { getProductBySlug } from '../../data/products.js'

// Large image + short story. Links to a real sample product page, no countdowns or stock claims.
export default function EditorialFeature() {
  const product = getProductBySlug('vertex-high')

  return (
    <section aria-labelledby="editorial-heading" className="container-page py-16 md:py-24">
      <div className="grid items-end gap-10 lg:grid-cols-12">
        <div className="relative lg:col-span-8">
          <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface sm:aspect-[16/10]">
            <SmartImage image={siteImages.editorial} sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
          </div>
          <span className="eyebrow absolute left-4 top-4 rounded-full bg-lime px-3 py-1.5 text-ink">New arrival</span>
        </div>

        <div className="lg:col-span-4">
          <p className="eyebrow mb-5 text-muted">05 — The edit</p>
          <h2 id="editorial-heading" className="text-4xl sm:text-5xl">
            A high-top with something to say.
          </h2>
          <p className="mt-6 text-muted">
            The Vertex High is a sample product in this design preview. It shows how a featured pair could be
            presented with a bigger image and a short story.
          </p>
          <div className="mt-8">
            <Button to={product ? `/product/${product.slug}` : '/shop'} variant="dark">
              Shop now
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
