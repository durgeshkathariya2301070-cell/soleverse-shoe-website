import { Mail } from 'lucide-react'

export default function NewsletterPreview() {
  return (
    <section aria-labelledby="contact-heading" className="border-t border-line">
      <div className="container-page grid items-center gap-8 py-16 md:py-20 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow mb-4 flex items-center gap-2 text-muted">
            <Mail size={14} aria-hidden="true" /> 06 — Get in touch
          </p>
          <h2 id="contact-heading" className="text-4xl sm:text-5xl">
            Let’s talk sneakers.
          </h2>
          <p className="mt-5 max-w-md text-muted">
            Have a question about a pair or your order? Reach out to the SOLEVERSE team.
          </p>
        </div>

        <div className="lg:col-span-6">
          <a
            href="mailto:kathariyadurgesh@gmail.com"
            className="inline-flex items-center gap-3 rounded-full bg-ink px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-ink/80"
          >
            <Mail size={18} aria-hidden="true" /> Email SOLEVERSE
          </a>
          <p className="mt-4 text-sm text-muted">
            <a href="mailto:kathariyadurgesh@gmail.com" className="underline underline-offset-4">
              kathariyadurgesh@gmail.com
            </a>
          </p>
          <p className="mt-2 text-xs text-muted">This opens your email app; no newsletter signup or email service is configured.</p>
        </div>
      </div>
    </section>
  )
}
