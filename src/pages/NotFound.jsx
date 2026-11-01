import Button from '../components/Button.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'

// Shown for unknown URLs and for product links whose slug does not exist.
export default function NotFound() {
  usePageTitle('Page not found')

  return (
    <div className="container-page py-24 text-center md:py-36">
      <p className="eyebrow text-muted">Error 404</p>
      <h1 className="mt-4 text-7xl sm:text-9xl">Off track.</h1>
      <p className="mx-auto mt-6 max-w-md text-muted">We could not find the page you were looking for.</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button to="/">Back home</Button>
        <Button to="/shop" variant="outline">
          Browse the shop
        </Button>
      </div>
    </div>
  )
}
