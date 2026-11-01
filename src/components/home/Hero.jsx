import Button from '../Button.jsx'
import SmartImage from '../SmartImage.jsx'
import { siteImages } from '../../data/siteImages.js'

// First screen of the site: big headline on the left, large sneaker photo on the right.
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="container-page grid items-center gap-10 py-10 md:py-16 lg:grid-cols-12 lg:gap-6 lg:py-20">
        {/* Text */}
        <div className="fade-up lg:col-span-6">
          <p className="eyebrow mb-6 flex items-center gap-3 text-muted">
            <span className="h-px w-8 bg-ink" aria-hidden="true" />
            Sample Collection · Vol. 01
          </p>

          <h1 id="hero-heading" className="text-[3.25rem] sm:text-7xl lg:text-[5.5rem]">
            Built to move.
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">Made to</span>
              {/* Lime highlight behind the words */}
              <span aria-hidden="true" className="absolute inset-x-[-0.15em] bottom-[0.06em] top-[0.3em] bg-lime" />
            </span>
            <br />
            stand out.
          </h1>

          <p className="mt-7 max-w-md text-base text-muted sm:text-lg">
            Step into your next dimension. Not just another pair, a whole new perspective on how sneakers
            are shown, chosen and worn.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button to="/shop">Explore Collection</Button>
            <Button to="/about" variant="link">
              Our Story
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="fade-up relative lg:col-span-6" style={{ animationDelay: '120ms' }}>
          {/* Lime circle sits behind the photo for depth */}
          <div
            aria-hidden="true"
            className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-lime sm:h-56 sm:w-56 lg:-right-10 lg:-top-10 lg:h-72 lg:w-72"
          />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-lift sm:aspect-[5/4] lg:aspect-[4/5]">
            <SmartImage
              image={siteImages.hero}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          {/* Edition label */}
          <div className="absolute -bottom-4 left-4 rounded-md border border-line bg-surface px-4 py-3 shadow-soft sm:left-auto sm:right-6">
            <p className="eyebrow text-muted">Edition</p>
            <p className="font-display text-lg font-extrabold uppercase leading-none" style={{ fontStretch: '85%' }}>
              Aero Runner 01
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
