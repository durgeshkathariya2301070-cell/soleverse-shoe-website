import Button from '../Button.jsx'
import SmartImage from '../SmartImage.jsx'
import { siteImages } from '../../data/siteImages.js'

// Dark editorial block. `on-dark` switches focus rings to lime (see index.css).
export default function SignatureSection() {
  return (
    <section aria-labelledby="signature-heading" className="on-dark bg-ink text-white">
      <div className="container-page grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-6 lg:order-2">
          <p className="eyebrow mb-5 text-lime">04 — Signature</p>
          <h2 id="signature-heading" className="text-5xl sm:text-7xl">
            Your style has <span className="text-lime">no default.</span>
          </h2>
          <p className="mt-7 max-w-md text-base text-white/70 sm:text-lg">
            Everyday movement looks different on everyone. SOLEVERSE is about choosing the pair that
            fits how you move and how you want to be seen.
          </p>
          <div className="mt-9">
            <Button to="/shop">Shop the collection</Button>
          </div>
        </div>

        <div className="lg:col-span-6 lg:order-1">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-white/15">
            <SmartImage image={siteImages.signature} sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  )
}
