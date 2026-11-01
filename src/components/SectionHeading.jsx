import { cn } from '../utils/cn.js'

// Consistent section opener: small label, big headline, optional paragraph.
//   as: which heading tag to use (h1 for page titles, h2 for sections)
//   tone: 'light' (default) or 'dark' for use on the dark background
export default function SectionHeading({ id, eyebrow, title, description, as: Tag = 'h2', tone = 'light', className }) {
  return (
    <div className={cn('max-w-2xl', className)}>
      {eyebrow && (
        <p className={cn('eyebrow mb-4', tone === 'dark' ? 'text-lime' : 'text-muted')}>{eyebrow}</p>
      )}
      <Tag id={id} className="text-[2.5rem] sm:text-5xl lg:text-6xl">{title}</Tag>
      {description && (
        <p className={cn('mt-5 max-w-xl text-base sm:text-lg', tone === 'dark' ? 'text-white/70' : 'text-muted')}>
          {description}
        </p>
      )}
    </div>
  )
}
