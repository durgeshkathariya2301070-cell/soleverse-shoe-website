import CategoryCard from '../components/CategoryCard.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { categories } from '../data/categories.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

// The "Collections" nav link goes here. For now collections are the four sample categories.
export default function Collections() {
  usePageTitle('Collections')

  return (
    <div className="container-page py-12 md:py-20">
      <SectionHeading
        as="h1"
        eyebrow="Collections · Preview"
        title="Collections"
        description="Our sample collections are grouped by how you move. Curated editorial collections will come in a later phase."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} className="min-h-80" />
        ))}
      </div>
    </div>
  )
}
