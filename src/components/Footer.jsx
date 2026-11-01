import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { categories } from '../data/categories.js'

function FooterColumn({ title, children }) {
  return (
    <div>
      <h2 className="eyebrow mb-5 leading-normal text-white/50">{title}</h2>
      <ul className="space-y-3 text-sm">{children}</ul>
    </div>
  )
}

const linkClass = 'text-white/80 transition-colors hover:text-lime'

export default function Footer() {
  return (
    <footer className="on-dark bg-ink text-white">
      <div id="contact" className="container-page py-16 md:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <Link
              to="/"
              className="font-display text-4xl font-black uppercase tracking-tight sm:text-5xl"
              style={{ fontStretch: '85%' }}
            >
              Soleverse
            </Link>
            <p className="mt-5 max-w-sm text-sm text-white/60">
              Designed for everyday movement. Built for individual expression.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:col-span-2 lg:col-span-8 lg:grid-cols-4">
            <FooterColumn title="Shop">
              <li>
                <Link to="/shop" className={linkClass}>
                  All sneakers
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link to={`/shop?category=${category.id}`} className={linkClass}>
                    {category.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Explore">
              <li><Link to="/shop" className={linkClass}>Shop</Link></li>
              <li><Link to="/collections" className={linkClass}>Collections</Link></li>
              <li><Link to="/account" className={linkClass}>Account</Link></li>
              <li><a href="#contact-us" className={linkClass}>Contact Us</a></li>
            </FooterColumn>

            <FooterColumn title="Contact Us">
              <li id="contact-us">
                <a href="mailto:kathariyadurgesh@gmail.com" className={`${linkClass} inline-flex items-center gap-2`}>
                  <Mail size={15} aria-hidden="true" /> kathariyadurgesh@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:9054187409" className={`${linkClass} inline-flex items-center gap-2`}>
                  <Phone size={15} aria-hidden="true" /> 9054187409
                </a>
              </li>
              <li>
                <a href="tel:9812678483" className={`${linkClass} inline-flex items-center gap-2`}>
                  <Phone size={15} aria-hidden="true" /> 9812678483
                </a>
              </li>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} SOLEVERSE. All rights reserved.</p>
          <p>No real payment is processed</p>
        </div>
      </div>
    </footer>
  )
}
