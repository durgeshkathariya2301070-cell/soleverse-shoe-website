import CategoryCard from '../CategoryCard.jsx'
import SectionHeading from '../SectionHeading.jsx'
import { categories } from '../../data/categories.js'

// On large screens the cards sit in an uneven grid; on phones they stack in one column.
const layoutByCategory = {
  lifestyle: 'lg:col-span-5',
  running: 'lg:col-span-7 lg:row-span-2',
  sports: 'lg:col-span-5',
  casual: 'lg:col-span-7 lg:row-span-2',
  skate: 'lg:col-span-5',
  trail: 'lg:col-span-7',
  formal: 'lg:col-span-5',
}

export default function ShopByCategory() {
  return (
    <section aria-labelledby="category-heading" className="bg-surface">
      <div className="container-page py-16 md:py-24">
        <SectionHeading
          id="category-heading"
          eyebrow="03 — Categories"
          title="Shop by category"
          description="Explore pairs built for the way you move."
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-12 lg:auto-rows-[minmax(18rem,auto)]">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} className={layoutByCategory[category.id]} />
          ))}
        </div>
      </div>
    </section>
  )
}
