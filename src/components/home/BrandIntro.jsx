// Short editorial statement. Only talks about the idea behind the brand; no claims about
// factories, materials or history.
export default function BrandIntro() {
  return (
    <section aria-labelledby="intro-heading" className="border-y border-line">
      <div className="container-page grid gap-8 py-16 md:py-24 lg:grid-cols-12">
        <p className="eyebrow text-muted lg:col-span-3">01 — The idea</p>
        <div className="lg:col-span-9">
          <h2 id="intro-heading" className="text-5xl sm:text-7xl lg:text-8xl">
            More than movement.
          </h2>
          <p className="mt-8 max-w-xl text-lg text-muted sm:text-xl">
            Designed for everyday movement. Built for individual expression.
          </p>
        </div>
      </div>
    </section>
  )
}
