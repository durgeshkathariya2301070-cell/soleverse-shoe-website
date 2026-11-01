import Button from '../components/Button.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import SmartImage from '../components/SmartImage.jsx'
import { siteImages } from '../data/siteImages.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

// Describes SOLEVERSE as a proposed concept. No company history, awards or sourcing claims.
const principles = [
  { title: 'See it clearly', text: 'Large photography and calm layouts so every pair gets proper attention.' },
  { title: 'Explore it freely', text: 'The long-term plan is a 3D view where you can turn a sneaker around. It is not built yet.' },
  { title: 'Choose with ease', text: 'Simple browsing, clear prices and a straightforward path from discovery to decision.' },
]

export default function About() {
  usePageTitle('Our Story')

  return (
    <>
      <section className="container-page py-12 md:py-20">
        <SectionHeading
          as="h1"
          eyebrow="Our Story · Concept"
          title="A new perspective on sneakers."
          description="SOLEVERSE is a proposed sneaker shopping brand. It is a concept being designed and built step by step."
        />
      </section>

      <section className="container-page pb-16 md:pb-24">
        <div className="aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface sm:aspect-[21/9]">
          <SmartImage image={siteImages.about} priority sizes="100vw" className="object-cover" />
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-12">
          <p className="eyebrow text-muted lg:col-span-3">The idea</p>
          <div className="space-y-6 text-lg text-muted lg:col-span-7">
            <p>
              Most sneaker shops look the same: a grid of small pictures and a lot of noise. SOLEVERSE starts from a
              different question: what if choosing sneakers felt as considered as the sneakers themselves?
            </p>
            <p>
              The goal is a shopping experience built around bold typography, big images and, later on, a 3D view
              that lets you look at a pair from every angle before you decide.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-24">
        <h2 className="text-4xl sm:text-5xl">What we are aiming for</h2>
        <ul className="mt-12 grid gap-10 md:grid-cols-3">
          {principles.map((item, index) => (
            <li key={item.title} className="border-t border-ink pt-5">
              <p className="eyebrow text-muted">0{index + 1}</p>
              <h3 className="mt-3 text-2xl">{item.title}</h3>
              <p className="mt-3 text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-14">
          <Button to="/shop">Explore the sample collection</Button>
        </div>
      </section>
    </>
  )
}
