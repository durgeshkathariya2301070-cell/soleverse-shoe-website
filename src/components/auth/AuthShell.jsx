// Two-column frame shared by Log in and Create account:
// a dark editorial panel (hidden on small screens) and the form on a light background.
export default function AuthShell({ eyebrow, title, description, children }) {
  return (
    <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-[5fr_6fr]">
      <aside className="on-dark relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <span aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rotate-45 rounded-[2.5rem] bg-lime/90" />
        <span aria-hidden="true" className="absolute -bottom-32 -left-20 h-72 w-72 rotate-45 rounded-[2.5rem] border border-white/15" />
        <p className="eyebrow relative text-lime">Soleverse account</p>
        <div className="relative">
          <p className="font-display text-6xl font-black uppercase leading-[0.9] tracking-tight xl:text-7xl" style={{ fontStretch: '85%' }}>
            Step into your next dimension.
          </p>
          <p className="mt-6 max-w-sm text-sm text-white/60">
            An account keeps your name saved with us. The bag, checkout and order history are coming in later phases.
          </p>
        </div>
      </aside>

      <section className="flex items-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <p className="eyebrow mb-4 text-muted">{eyebrow}</p>
          <h1 className="text-5xl sm:text-6xl">{title}</h1>
          {description && <p className="mt-4 text-muted">{description}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  )
}
