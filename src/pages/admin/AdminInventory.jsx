import { useEffect, useMemo, useState } from 'react'
import Button from '../../components/Button.jsx'
import InventoryProductAutocomplete from '../../components/admin/InventoryProductAutocomplete.jsx'
import { fetchAdminInventory, saveAdminVariant } from '../../services/adminService.js'
import { selectInventoryProduct } from '../../utils/adminInventory.js'
import { validateAdminVariant } from '../../utils/adminValidation.js'

const initialVariant = { product_id: '', color_id: '', color_label: '', color_hex: '#171717', size: '', stock: '0' }
const inputClass = 'w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm'

export default function AdminInventory() {
  const [inventory, setInventory] = useState({ products: [], variants: [] })
  const [stockValues, setStockValues] = useState({})
  const [form, setForm] = useState(initialVariant)
  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [savingKey, setSavingKey] = useState('')

  async function load() {
    setStatus('loading')
    const { data, error: loadError } = await fetchAdminInventory()
    if (loadError) { setError(loadError); setStatus('error'); return }
    setInventory(data)
    setStockValues(Object.fromEntries(data.variants.map((variant) => [
      `${variant.product_id}|${variant.color_id}|${variant.size}`, String(variant.stock),
    ])))
    setStatus('ready')
    setError('')
  }

  useEffect(() => { load() }, [])

  const productName = useMemo(
    () => Object.fromEntries(inventory.products.map((product) => [product.id, product.name])),
    [inventory.products],
  )

  async function saveStock(variant) {
    const key = `${variant.product_id}|${variant.color_id}|${variant.size}`
    const nextStock = Number(stockValues[key])
    const issues = validateAdminVariant({ ...variant, stock: stockValues[key] })
    if (issues.stock) { setMessage(issues.stock); return }
    setSavingKey(key)
    setMessage('')
    const { error: saveError } = await saveAdminVariant({ ...variant, stock: nextStock }, false)
    setSavingKey('')
    if (saveError) { setMessage(saveError); return }
    setMessage(`Stock updated for ${productName[variant.product_id]}, ${variant.color_label}, size ${variant.size}.`)
    await load()
  }

  async function addVariant(event) {
    event.preventDefault()
    const issues = validateAdminVariant(form)
    setFieldErrors(issues)
    if (Object.keys(issues).length) return
    setSavingKey('new')
    setMessage('')
    const payload = { ...form, size: Number(form.size), stock: Number(form.stock) }
    const { error: saveError } = await saveAdminVariant(payload, true)
    setSavingKey('')
    if (saveError) { setMessage(saveError); return }
    setMessage('Size and colour variant added.')
    setForm({ ...initialVariant, product_id: form.product_id })
    await load()
  }

  return (
    <div>
      <p className="eyebrow text-muted">Stock by colour and size</p>
      <h2 className="mt-2 text-4xl">Inventory</h2>
      <p className="mt-3 text-sm text-muted">Non-negative integer stock is enforced in the database. Checkout locks variant rows and deducts stock transactionally.</p>
      {message && <p className="mt-5 rounded-xl border border-line bg-white p-4 text-sm" role="status">{message}</p>}
      {error && <p className="mt-5 rounded-xl border border-red-200 bg-white p-4 text-sm" role="alert">{error}</p>}
      {status === 'loading' && <p className="mt-6 text-sm text-muted" role="status">Loading inventory…</p>}
      {status === 'error' && <Button className="mt-4" variant="outline" onClick={load}>Try again</Button>}

      {status === 'ready' && (
        <>
          <section className="mt-7 rounded-2xl border border-line bg-white p-5">
            <h3 className="text-2xl">Add size and colour</h3>
            <form onSubmit={addVariant} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <InventoryProductAutocomplete
                products={inventory.products}
                value={form.product_id}
                error={fieldErrors.product_id}
                onSelect={(product) => {
                  setForm((current) => selectInventoryProduct(current, product))
                  setFieldErrors((current) => ({ ...current, product_id: undefined }))
                }}
                onClear={() => setForm((current) => ({ ...current, product_id: '' }))}
              />
              <label className="text-sm">Colour ID<input className={inputClass} value={form.color_id} onChange={(e) => setForm({ ...form, color_id: e.target.value })} placeholder="core-black" />{fieldErrors.color_id && <small className="text-red-700">{fieldErrors.color_id}</small>}</label>
              <label className="text-sm">Colour name<input className={inputClass} value={form.color_label} onChange={(e) => setForm({ ...form, color_label: e.target.value })} placeholder="Core Black" />{fieldErrors.color_label && <small className="text-red-700">{fieldErrors.color_label}</small>}</label>
              <label className="text-sm">Swatch colour<input className={inputClass} value={form.color_hex} onChange={(e) => setForm({ ...form, color_hex: e.target.value })} placeholder="#171717" />{fieldErrors.color_hex && <small className="text-red-700">{fieldErrors.color_hex}</small>}</label>
              <label className="text-sm">UK size<input className={inputClass} type="number" min="1" max="20" step="1" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />{fieldErrors.size && <small className="text-red-700">{fieldErrors.size}</small>}</label>
              <label className="text-sm">Initial stock<input className={inputClass} type="number" min="0" max="100000" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />{fieldErrors.stock && <small className="text-red-700">{fieldErrors.stock}</small>}</label>
              <div className="sm:col-span-2 xl:col-span-3"><Button type="submit" disabled={savingKey === 'new'}>{savingKey === 'new' ? 'Adding…' : 'Add variant'}</Button></div>
            </form>
          </section>

          {!inventory.variants.length ? <p className="mt-8 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No product variants exist yet.</p> : (
            <div className="mt-7 space-y-5">
              {inventory.products.map((product) => {
                const variants = inventory.variants.filter((variant) => variant.product_id === product.id)
                if (!variants.length) return null
                return (
                  <section key={product.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                    <div className="border-b border-line p-4"><h3 className="text-xl">{product.name}</h3><p className="eyebrow mt-1 text-muted">{product.is_active ? 'Active' : 'Unpublished'} · {variants.length} variants</p></div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-canvas text-muted"><tr><th className="p-3">Colour</th><th className="p-3">Size</th><th className="p-3">Availability</th><th className="p-3">Stock</th><th className="p-3">Action</th></tr></thead>
                        <tbody>{variants.map((variant) => {
                          const key = `${variant.product_id}|${variant.color_id}|${variant.size}`
                          return <tr key={key} className="border-t border-line">
                            <td className="p-3"><span className="mr-2 inline-block h-4 w-4 rounded-full border border-line align-middle" style={{ backgroundColor: variant.color_hex }} />{variant.color_label}</td>
                            <td className="p-3">UK {variant.size}</td><td className="p-3">{variant.stock > 0 ? 'In stock' : 'Sold out'}</td>
                            <td className="w-32 p-3"><label className="sr-only" htmlFor={`stock-${key}`}>Stock for {variant.color_label}, size {variant.size}</label><input id={`stock-${key}`} className={inputClass} type="number" min="0" max="100000" step="1" value={stockValues[key] ?? ''} onChange={(e) => setStockValues({ ...stockValues, [key]: e.target.value })} /></td>
                            <td className="p-3"><Button variant="outline" disabled={savingKey === key || Number(stockValues[key]) === variant.stock} onClick={() => saveStock(variant)}>{savingKey === key ? 'Saving…' : 'Save stock'}</Button></td>
                          </tr>
                        })}</tbody>
                      </table>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
