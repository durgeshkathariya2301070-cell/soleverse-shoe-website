import Hero from '../components/home/Hero.jsx'
import BrandIntro from '../components/home/BrandIntro.jsx'
import FeaturedCollection from '../components/home/FeaturedCollection.jsx'
import ShopByCategory from '../components/home/ShopByCategory.jsx'
import SignatureSection from '../components/home/SignatureSection.jsx'
import EditorialFeature from '../components/home/EditorialFeature.jsx'
import NewsletterPreview from '../components/home/NewsletterPreview.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'

// The homepage is just the sections stacked in order. Each section lives in components/home/.
export default function Home() {
  usePageTitle()

  return (
    <>
      <Hero />
      <BrandIntro />
      <FeaturedCollection />
      <ShopByCategory />
      <SignatureSection />
      <EditorialFeature />
      <NewsletterPreview />
    </>
  )
}
