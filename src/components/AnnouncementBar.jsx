import { Link } from 'react-router-dom'

// Slim bar above the navbar. It only invites people to browse: no discounts or shipping promises.
export default function AnnouncementBar() {
  return (
    <div className="bg-ink text-white on-dark">
      <p className="container-page py-2 text-center text-[0.6875rem] font-medium uppercase tracking-[0.14em] sm:text-xs">
        Your next favorite pair is here —{' '}
        <Link to="/shop" className="text-lime underline-offset-4 hover:underline">
          Explore the collection
        </Link>
      </p>
    </div>
  )
}
