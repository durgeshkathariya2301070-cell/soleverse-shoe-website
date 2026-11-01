import { useEffect, useRef, useState } from 'react'
import { getImageSources } from '../utils/images.js'
import { cn } from '../utils/cn.js'

// A drawn sneaker silhouette. Shown if a photo fails to load, so the layout never breaks.
function ShoeFallback({ label }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-full w-full items-center justify-center bg-[#ecece6] text-ink/25"
    >
      <svg viewBox="0 0 120 64" className="w-3/5 max-w-[12rem]" fill="currentColor" aria-hidden="true">
        {/* Upper: heel, collar, tongue, laces slope and toe box in one side-view shape */}
        <path d="M8 46c-1-12 1-24 6-30 2-2 5-3 8-2l6 2c3 5 8 8 14 8l7-8c2-2 5-2 7 0l6 7c9 6 24 8 38 14 7 3 11 7 11 12v3H8z" />
        {/* Sole */}
        <rect x="4" y="46" width="114" height="9" rx="4.5" opacity="0.55" />
        {/* Lace marks */}
        <path d="M52 27l8 5M58 22l8 6M64 19l8 6" stroke="#f7f7f2" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    </div>
  )
}

// Shows a photo with: a loading shimmer, responsive sizes, and a fallback if it cannot load.
//   image     -> an entry like { unsplashId, alt } or { src, alt } from our data files
//   className -> classes for the <img> (use object-cover / object-contain)
//   priority  -> true for the first big image on a page (loads immediately)
export default function SmartImage({ image, sizes, className, priority = false }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'loaded' | 'error'
  const { src, srcSet } = getImageSources(image)
  const [usingFallback, setUsingFallback] = useState(false)
  const activeSrc = usingFallback ? image?.fallbackSrc : src
  const imgRef = useRef(null)

  useEffect(() => {
    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setStatus('loaded')
      } else {
        if (!usingFallback && image?.fallbackSrc && image.fallbackSrc !== src) {
          setUsingFallback(true)
          setStatus('loading')
        } else {
          setStatus('error')
        }
      }
    }
  }, [activeSrc, usingFallback, image?.fallbackSrc, src])

  if (!activeSrc || status === 'error') {
    return <ShoeFallback label={image?.alt ?? 'Sneaker image unavailable'} />
  }

  return (
    <div className={cn('relative h-full w-full', status === 'loading' && 'image-loading')}>
      <img
        ref={imgRef}
        src={activeSrc}
        srcSet={usingFallback ? undefined : srcSet}
        sizes={sizes}
        alt={image.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setStatus('loaded')}
        onError={() => {
          if (!usingFallback && image?.fallbackSrc && image.fallbackSrc !== src) {
            setUsingFallback(true)
            setStatus('loading')
            return
          }
          setStatus('error')
        }}
        // Optional crop used by gallery close-ups: image.zoom (e.g. 1.9) and image.focus (e.g. '78% 62%').
        style={
          image.zoom
            ? { transform: `scale(${image.zoom})`, transformOrigin: image.focus ?? '50% 50%' }
            : undefined
        }
        className={cn(
          'h-full w-full transition-opacity duration-500',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
    </div>
  )
}
