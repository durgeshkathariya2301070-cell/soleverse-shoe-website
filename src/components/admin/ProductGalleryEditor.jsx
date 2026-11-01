import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2, Upload } from 'lucide-react'

const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm'

function Preview({ image }) {
  const [status, setStatus] = useState('loading')
  useEffect(() => setStatus('loading'), [image.url])
  if (!image.url) return null
  return (
    <div className="flex items-center gap-3">
      <img
        key={image.url}
        src={image.url}
        alt={image.alt_text || 'Product gallery preview'}
        className="h-16 w-16 rounded-lg border border-line object-cover"
        onError={() => setStatus('error')}
        onLoad={() => setStatus('loaded')}
      />
      <span className={`text-xs ${status === 'error' ? 'text-red-700' : 'text-muted'}`} aria-live="polite">
        {status === 'error' ? 'This image URL could not be loaded; check the URL before saving.' : status === 'loading' ? 'Checking image…' : 'Image preview loaded.'}
      </span>
    </div>
  )
}

export default function ProductGalleryEditor({ images, onChange, productId, onUpload, uploading, uploadProgress, fieldErrors }) {
  const fileInput = useRef(null)

  function updateImage(index, patch) {
    onChange(images.map((image, imageIndex) => imageIndex === index ? { ...image, ...patch } : image))
  }

  function moveImage(index, target) {
    if (target < 0 || target >= images.length) return
    const reordered = [...images]
    const [image] = reordered.splice(index, 1)
    reordered.splice(target, 0, image)
    onChange(reordered)
  }

  function selectPrimary(index) {
    const reordered = [...images]
    const [image] = reordered.splice(index, 1)
    reordered.unshift(image)
    onChange(reordered)
  }

  return (
    <section className="sm:col-span-2 rounded-xl border border-line p-4" aria-labelledby="product-gallery-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 id="product-gallery-title" className="text-lg font-semibold">Product Images / Gallery</h4>
          <p className="mt-1 text-xs text-muted">The first image is the cover image used on product cards, in the cart, and at checkout.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold" onClick={() => onChange([...images, { url: '', alt_text: '' }])}>
            <ImagePlus size={15} aria-hidden="true" /> Add image URL
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold disabled:opacity-60" disabled={uploading || !productId} onClick={() => fileInput.current?.click()}>
            <Upload size={15} aria-hidden="true" /> {uploading ? uploadProgress : 'Upload images'}
          </button>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(event) => {
              void onUpload([...event.target.files])
              event.target.value = ''
            }}
          />
        </div>
      </div>
      {!productId && <p className="mt-3 text-xs text-muted">Enter a valid Product ID before uploading local images. Image URLs can be added now.</p>}
      {uploading && <p className="mt-3 text-xs text-muted" role="status">{uploadProgress}</p>}
      {images.length === 0 && <p className="mt-4 rounded-lg bg-canvas p-4 text-sm text-muted">No gallery images yet. Add a URL or upload files.</p>}
      <ol className="mt-4 space-y-3">
        {images.map((image, index) => (
          <li key={`gallery-${index}`} className="rounded-lg border border-line p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">{index === 0 ? 'Primary / cover image' : `Gallery image ${index + 1}`}</span>
              <div className="flex flex-wrap gap-2">
                {index > 0 && (
                  <button type="button" className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs" onClick={() => selectPrimary(index)}>
                    <Star size={13} aria-hidden="true" /> Make primary
                  </button>
                )}
                <button type="button" aria-label={`Move image ${index + 1} earlier`} disabled={index === 0} className="rounded border border-line p-1.5 disabled:opacity-40" onClick={() => moveImage(index, index - 1)}><ArrowUp size={15} aria-hidden="true" /></button>
                <button type="button" aria-label={`Move image ${index + 1} later`} disabled={index === images.length - 1} className="rounded border border-line p-1.5 disabled:opacity-40" onClick={() => moveImage(index, index + 1)}><ArrowDown size={15} aria-hidden="true" /></button>
                <button type="button" aria-label={`Remove image ${index + 1}`} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700" onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))}>
                  <Trash2 size={13} aria-hidden="true" /> Remove
                </button>
              </div>
            </div>
            <label className="block text-sm">Image URL or uploaded Storage URL
              <input className={inputClass} type="url" maxLength={2048} value={image.url} onChange={(event) => updateImage(index, { url: event.target.value })} placeholder="https://… or /products/…" />
              {fieldErrors[`images.${index}.url`] && <small className="text-red-700">{fieldErrors[`images.${index}.url`]}</small>}
            </label>
            <label className="mt-3 block text-sm">Image description (alt text)
              <input className={inputClass} maxLength={200} value={image.alt_text} onChange={(event) => updateImage(index, { alt_text: event.target.value })} placeholder="Side view of the shoe" />
              {fieldErrors[`images.${index}.alt_text`] && <small className="text-red-700">{fieldErrors[`images.${index}.alt_text`]}</small>}
            </label>
            <div className="mt-3"><Preview image={image} /></div>
          </li>
        ))}
      </ol>
    </section>
  )
}
