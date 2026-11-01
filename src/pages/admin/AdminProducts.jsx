import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import ProductGalleryEditor from '../../components/admin/ProductGalleryEditor.jsx'
import ProductVariantsEditor from '../../components/admin/ProductVariantsEditor.jsx'
import { fetchAdminProducts, saveAdminProduct, uploadAdminProductImage } from '../../services/adminService.js'
import { validateAdminProduct, validateAdminProductVariants } from '../../utils/adminValidation.js'
import { categories } from '../../data/categories.js'
import { formatPrice } from '../../utils/formatPrice.js'
import { useCatalogue } from '../../context/CatalogueContext.jsx'
import {
  clearAdminProductDraft,
  readAdminProductDraft,
  writeAdminProductDraft,
} from '../../utils/adminProductDraft.js'

const blank = {
  id: '', slug: '', name: '', category: 'lifestyle', brand: '', sport: '', style: '', price_inr: '',
  short_description: '', description: '', image_url: '', images: [], variants: [], is_active: false,
}

const inputClass = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm'
const selectClass = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm'

const SPORT_OPTIONS = [
  { value: '', label: 'None / general' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'football', label: 'Football' },
  { value: 'cricket', label: 'Cricket' },
]

const STYLE_SUGGESTIONS = [
  'Road Runner', 'Low Top', 'High Top', 'Mid Top', 'Training', 'Low Dunk',
  'Knit', 'Canvas', 'Suede', 'Court', 'Trail Runner', 'Formal', 'Football', 'Cricket', 'Skate Low',
]

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

function toForm(product) {
  const productImages = [...(product.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => ({ url: image.image_url, alt_text: image.alt_text ?? '' }))
  if (!productImages.length && product.image_url) {
    productImages.push({ url: product.image_url, alt_text: `${product.name}, product photo` })
  }
  return {
    id: product.id, slug: product.slug, name: product.name, category: product.category,
    brand: product.brand ?? '', sport: product.sport ?? '', style: product.style ?? '',
    price_inr: String(product.price_inr), short_description: product.short_description ?? '',
    description: product.description ?? '', image_url: product.image_url ?? '',
    images: productImages,
    variants: (product.product_variants ?? []).map((variant) => ({
      color_id: variant.color_id,
      color_label: variant.color_label,
      color_hex: variant.color_hex ?? '#171717',
      size: String(variant.size),
      stock: String(variant.stock),
      persisted: true,
    })),
    is_active: product.is_active,
  }
}

function hasDraftContent(form) {
  return Object.keys(blank).some((key) => (
    Array.isArray(blank[key])
      ? form[key].length > 0
      : form[key] !== blank[key]
  ))
}

export default function AdminProducts() {
  const [initialDraft] = useState(readAdminProductDraft)
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(() => initialDraft.form ?? blank)
  const [editingId, setEditingId] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft.form))
  const [draftTouched, setDraftTouched] = useState(Boolean(initialDraft.form))
  const [draftStorageError, setDraftStorageError] = useState(initialDraft.error)
  const [showProductForm, setShowProductForm] = useState(Boolean(initialDraft.form))
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const formRef = useRef(null)
  const productIdRef = useRef(null)
  const { refreshCatalogue } = useCatalogue()

  async function load() {
    setStatus('loading')
    const result = await fetchAdminProducts()
    if (result.error) { setError(result.error); setStatus('error'); return }
    setProducts(result.data ?? [])
    setError('')
    setStatus('ready')
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (editingId !== null || !draftTouched) return
    setDraftStorageError(!writeAdminProductDraft(form))
  }, [form, editingId, draftTouched])

  function beginEdit(product) {
    setShowProductForm(true)
    setEditingId(product.id)
    setForm(toForm(product))
    setDraftTouched(false)
    setFieldErrors({})
    setMessage('')
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function beginCreate() {
    const draft = editingId !== null || !hasDraftContent(form)
      ? readAdminProductDraft()
      : { form, error: false }
    setEditingId(null)
    setForm(draft.form ?? blank)
    setShowProductForm(true)
    setDraftTouched(Boolean(draft.form))
    setFieldErrors({})
    setMessage(draft.error ? 'Draft storage is unavailable in this browser session.' : '')
    setDraftRestored(Boolean(draft.form))
    setDraftStorageError(draft.error)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      productIdRef.current?.focus({ preventScroll: true })
    }, 80)
  }

  function clearForm() {
    const cleared = clearAdminProductDraft()
    setEditingId(null)
    setForm(blank)
    setShowProductForm(true)
    setDraftTouched(false)
    setFieldErrors({})
    setDraftRestored(false)
    setDraftStorageError(!cleared)
    setMessage(cleared ? 'Product form cleared.' : 'The form was cleared, but this browser could not remove its saved draft.')
  }

  function updateForm(update) {
    setForm((current) => {
      const next = typeof update === 'function' ? update(current) : update
      return {
        ...next,
        image_url: next.images?.[0]?.url ?? '',
      }
    })
    if (editingId === null) setDraftTouched(true)
  }

  function handleNameChange(name) {
    updateForm((current) => {
      const next = { ...current, name }
      if (!current.slug || current.slug === slugify(current.name)) {
        next.slug = slugify(name)
      }
      return next
    })
  }

  async function submit(event) {
    event.preventDefault()
    const errors = {
      ...validateAdminProduct({ ...form, image_url: '' }),
      ...validateAdminProductVariants(form.variants),
    }
    form.images.forEach((image, index) => {
      const url = image.url.trim()
      if (!url || url.length > 2048 || !(/^(https?:\/\/|\/)/i.test(url)) || url.startsWith('//')) {
        errors[`images.${index}.url`] = 'Enter a valid http(s) image URL or site-relative path.'
      }
      if (image.alt_text.length > 200) errors[`images.${index}.alt_text`] = 'Image description must be 200 characters or fewer.'
    })
    if (form.images.length > 50) errors.images = 'A product can have at most 50 images.'
    if (form.is_active && form.variants.length === 0) {
      errors.is_active = 'Add at least one size and colour variant before publishing.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setSaving(true)
    setMessage('')
    const payload = {
      ...form,
      price_inr: Number(form.price_inr),
      slug: form.slug.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      brand: form.brand.trim(),
      sport: form.sport.trim(),
      style: form.style.trim(),
      short_description: form.short_description.trim(),
      description: form.description.trim(),
      image_url: form.images[0]?.url.trim() ?? '',
      images: form.images.map((image) => ({ ...image, url: image.url.trim() })),
      variants: form.variants,
    }
    const { error: saveError } = await saveAdminProduct(payload, editingId === null)
    setSaving(false)
    if (saveError) { setMessage(saveError); return }
    const wasNew = editingId === null
    const draftCleared = wasNew ? clearAdminProductDraft() : true
    const remainingDraft = wasNew ? null : readAdminProductDraft()
    setMessage(wasNew
      ? draftCleared ? 'Product created.' : 'Product created, but this browser could not remove its saved draft.'
      : remainingDraft?.error
        ? 'Product saved. A saved new-product draft could not be restored in this browser.'
        : 'Product saved.')
    setForm(remainingDraft?.form ?? blank)
    setEditingId(null)
    setShowProductForm(false)
    setDraftRestored(Boolean(remainingDraft?.form))
    setDraftTouched(Boolean(remainingDraft?.form))
    setDraftStorageError(wasNew ? !draftCleared : Boolean(remainingDraft?.error))
    setPage(1)
    await refreshCatalogue()
    await load()
  }

  async function uploadImages(files) {
    const id = form.id.trim()
    if (!/^[a-z0-9-]{1,40}$/.test(id)) {
      setMessage('Enter a valid Product ID before uploading images.')
      return
    }
    setUploadingImages(true)
    setMessage('')
    for (const [index, file] of files.entries()) {
      setUploadProgress(`Uploading image ${index + 1} of ${files.length}…`)
      const { data, error: uploadError } = await uploadAdminProductImage(id, file)
      if (uploadError) {
        setMessage(`${file.name}: ${uploadError}`)
        break
      }
      updateForm((current) => ({
        ...current,
        images: [...current.images, { url: data.url, alt_text: `${current.name || 'Product'} view` }],
      }))
    }
    setUploadProgress('')
    setUploadingImages(false)
  }

  async function toggleAvailability(product) {
    if (!product.is_active && !(product.product_variants?.length)) {
      setMessage('Add at least one size and colour variant in Inventory before publishing this product.')
      return
    }
    const { error: saveError } = await saveAdminProduct({ ...product, is_active: !product.is_active }, false)
    if (saveError) { setMessage(saveError); return }
    setMessage(product.is_active ? 'Product unpublished.' : 'Product published.')
    await refreshCatalogue()
    await load()
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch = !query || [product.id, product.name, product.slug, product.brand]
        .some((value) => String(value ?? '').toLowerCase().includes(query))
      return matchesSearch && (!categoryFilter || product.category === categoryFilter)
    })
  }, [products, search, categoryFilter])
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <p className="eyebrow text-muted">Catalogue administration</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-4xl">Products</h2><p className="mt-2 text-sm text-muted">Database catalogue; inactive products are hidden from customers.</p></div>
        <Button onClick={beginCreate}>Add product</Button>
      </div>

      {(message || error) && <p className={`mt-5 rounded-xl border p-4 text-sm ${error ? 'border-red-200 bg-white' : 'border-line bg-white'}`} role={error ? 'alert' : 'status'}>{error || message}</p>}
      {status === 'loading' && <p className="mt-8 text-sm text-muted" role="status">Loading products…</p>}
      {status === 'error' && <Button className="mt-4" variant="outline" onClick={load}>Try again</Button>}
      {status === 'ready' && products.length === 0 && <p className="mt-8 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No products in the database yet.</p>}
      {status === 'ready' && products.length > 0 && (
        <section className="mt-6">
          <div className="flex flex-wrap gap-3">
            <label className="min-w-56 flex-1 text-sm">Search products
              <input className={inputClass} type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="ID, name, slug, or brand" />
            </label>
            <label className="min-w-48 text-sm">Category
              <select className={selectClass} value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1) }}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr><th className="p-3">ID</th><th className="p-3">Image</th><th className="p-3">Product</th><th className="p-3">Category / Brand</th><th className="p-3">Price</th><th className="p-3">Variants / Stock</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const variants = product.product_variants ?? []
                  const stock = variants.reduce((sum, variant) => sum + variant.stock, 0)
                  const thumb = product.image_url || product.product_images?.[0]?.image_url
                  return (
                    <tr key={product.id} className="border-t border-line align-middle">
                      <td className="p-3 font-mono text-xs">{product.id}</td>
                      <td className="p-3">
                        <div className="h-12 w-12 overflow-hidden rounded-md border border-line bg-canvas">
                          {thumb ? <SmartImage image={{ src: thumb, alt: `${product.name} thumbnail` }} className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted">—</span>}
                        </div>
                      </td>
                      <td className="p-3 font-semibold">{product.name}</td>
                      <td className="p-3">{categories.find((category) => category.id === product.category)?.label ?? product.category}<span className="block text-xs text-muted">{product.brand || 'No brand'}</span></td>
                      <td className="p-3 whitespace-nowrap">{formatPrice(product.price_inr)}</td>
                      <td className="p-3 whitespace-nowrap">{variants.length} variants · {stock} pairs{variants.length > 0 && stock === 0 ? ' · out of stock' : ''}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${product.is_active ? 'bg-lime-100 text-lime-800' : 'bg-canvas text-muted'}`}>{product.is_active ? 'Published' : 'Draft'}</span></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Link className="rounded-full border border-line px-3 py-2 text-xs font-semibold" to={`/product/${product.slug}`} target="_blank" rel="noreferrer">View</Link>
                          <Button className="px-3 py-2" variant="outline" onClick={() => beginEdit(product)}>Edit</Button>
                          <Button className="px-3 py-2" variant="outline" onClick={() => toggleAvailability(product)}>{product.is_active ? 'Unpublish' : 'Publish'}</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!visibleProducts.length && <tr><td className="p-6 text-center text-muted" colSpan="8">No products match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted">Showing {filteredProducts.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredProducts.length)} of {filteredProducts.length} products</p>
            {pageCount > 1 && <div className="flex gap-2"><Button variant="outline" className="px-4 py-2" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="self-center">Page {page} of {pageCount}</span><Button variant="outline" className="px-4 py-2" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
          </div>
        </section>
      )}

      {showProductForm && (
        <section ref={formRef} className="mt-10 rounded-2xl border border-line bg-white p-5 md:p-7" aria-labelledby="product-form-title">
          <div className="flex items-start justify-between gap-4">
            <div><p className="eyebrow text-muted">{editingId === null ? 'New catalogue entry' : `Editing ${editingId}`}</p><h3 id="product-form-title" className="mt-2 text-2xl">{editingId === null ? 'Create product' : 'Edit product'}</h3></div>
            {editingId !== null && <Button variant="outline" onClick={beginCreate}>New product</Button>}
          </div>
          {draftRestored && editingId === null && (
            <p className="mt-5 rounded-xl border border-lime-300 bg-lime-50 p-3 text-sm" role="status">
              Your saved product draft was restored. It is stored only in this browser tab and has not been saved to the catalogue yet.
            </p>
          )}
          {draftStorageError && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-white p-3 text-sm" role="alert">
              This browser could not store the product draft for this tab. Keep this page open until you save the product.
            </p>
          )}
          <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>

            {/* ID + Slug */}
            <label className="text-sm">Product ID
              <input ref={productIdRef} className={inputClass} type="text" readOnly={editingId !== null} required value={form.id} onChange={(e) => updateForm((current) => ({ ...current, id: e.target.value }))} placeholder="sv-043" />
              {fieldErrors.id && <small className="text-red-700">{fieldErrors.id}</small>}
              {editingId !== null && <small className="block text-muted">Product IDs cannot be changed after creation.</small>}
            </label>
            <label className="text-sm">URL slug
              <input className={inputClass} required value={form.slug} onChange={(e) => updateForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name" />
              {fieldErrors.slug && <small className="text-red-700">{fieldErrors.slug}</small>}
            </label>

            {/* Name + Category */}
            <label className="text-sm">Name
              <input className={inputClass} required maxLength={120} value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Aero Runner Pro" />
              {fieldErrors.name && <small className="text-red-700">{fieldErrors.name}</small>}
            </label>
            <label className="text-sm">Category
              <select className={selectClass} required value={form.category} onChange={(e) => updateForm({ ...form, category: e.target.value })}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
              {fieldErrors.category && <small className="text-red-700">{fieldErrors.category}</small>}
            </label>

            {/* Brand + Price */}
            <label className="text-sm">Brand
              <input className={inputClass} maxLength={60} value={form.brand} onChange={(e) => updateForm({ ...form, brand: e.target.value })} placeholder="e.g. Nike, Adidas" />
              {fieldErrors.brand && <small className="text-red-700">{fieldErrors.brand}</small>}
            </label>
            <label className="text-sm">Price (INR ₹)
              <input className={inputClass} type="number" min="1" max="1000000" step="1" required value={form.price_inr} onChange={(e) => updateForm({ ...form, price_inr: e.target.value })} placeholder="e.g. 6999" />
              {fieldErrors.price_inr && <small className="text-red-700">{fieldErrors.price_inr}</small>}
            </label>

            {/* Sport + Style */}
            <label className="text-sm">Sport filter
              <select className={selectClass} value={form.sport} onChange={(e) => updateForm({ ...form, sport: e.target.value })}>
                {SPORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.sport && <small className="text-red-700">{fieldErrors.sport}</small>}
            </label>
            <label className="text-sm">Style
              <input className={inputClass} maxLength={60} value={form.style} onChange={(e) => updateForm({ ...form, style: e.target.value })} placeholder="e.g. Road Runner, High Top" list="style-suggestions" />
              <datalist id="style-suggestions">
                {STYLE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
              {fieldErrors.style && <small className="text-red-700">{fieldErrors.style}</small>}
            </label>

                    <ProductGalleryEditor
                      images={form.images}
                      onChange={(images) => updateForm({ ...form, images })}
                      productId={form.id}
                      onUpload={uploadImages}
                      uploading={uploadingImages}
                      uploadProgress={uploadProgress}
                      fieldErrors={fieldErrors}
                    />
                    {fieldErrors.images && <p className="text-sm text-red-700 sm:col-span-2">{fieldErrors.images}</p>}

            {/* Short description */}
            <label className="text-sm sm:col-span-2">Short description
              <input className={inputClass} maxLength={240} value={form.short_description} onChange={(e) => updateForm({ ...form, short_description: e.target.value })} placeholder="One sentence shown on product cards" />
              {fieldErrors.short_description && <small className="text-red-700">{fieldErrors.short_description}</small>}
            </label>

            {/* Full description */}
            <label className="text-sm sm:col-span-2">Full description
              <textarea className={inputClass} rows="4" maxLength={5000} value={form.description} onChange={(e) => updateForm({ ...form, description: e.target.value })} placeholder="Detailed product description for the product page" />
              {fieldErrors.description && <small className="text-red-700">{fieldErrors.description}</small>}
            </label>

            <ProductVariantsEditor
              variants={form.variants}
              onChange={(variants) => updateForm({ ...form, variants })}
              fieldErrors={fieldErrors}
            />

            {/* Published toggle */}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => updateForm({ ...form, is_active: e.target.checked })} />
              Published and visible in the database catalogue
            </label>
            {fieldErrors.is_active && <small className="text-red-700 sm:col-span-2">{fieldErrors.is_active}</small>}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button type="submit" disabled={saving || uploadingImages}>{saving ? 'Saving…' : uploadingImages ? 'Uploading images…' : 'Save product'}</Button>
              <Button variant="outline" onClick={clearForm}>Clear form</Button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
