import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Check, Ruler } from 'lucide-react'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import ProductCard from '../components/ProductCard.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import ProductMedia from '../components/product/ProductMedia.jsx'
import CustomizePanel from '../components/product/CustomizePanel.jsx'
import ColorSelector from '../components/product/ColorSelector.jsx'
import SizeSelector from '../components/product/SizeSelector.jsx'
import SizeGuideDialog from '../components/product/SizeGuideDialog.jsx'
import NotFound from './NotFound.jsx'
import {
  getStock,
  getAvailableSizes,
  isColorAvailable,
  isSoldOut,
} from '../data/products.js'
import { getCategoryLabel } from '../data/categories.js'
import { formatPrice } from '../utils/formatPrice.js'
import { useCart } from '../context/CartContext.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { cn } from '../utils/cn.js'
import { useCatalogue } from '../context/CatalogueContext.jsx'

// One page for every product. The URL (/product/aero-runner-01) picks the product from the data.
// "Add to bag" puts the chosen colour + size into the bag (Phase 6).
export default function ProductDetail() {
  const { slug } = useParams()
  const { products, status } = useCatalogue()
  const product = products.find((item) => item.slug === slug) ?? null

  usePageTitle(product ? product.name : 'Product not found')

  if (!product && status === 'loading') {
    return <div className="container-page py-24 text-center" role="status">Loading product…</div>
  }
  if (!product) return <NotFound />
  if (product.availableColors.length === 0 || product.availableSizes.length === 0) {
    return (
      <div className="container-page py-20 text-center md:py-28">
        <p className="eyebrow text-muted">Not yet available</p>
        <h1 className="mt-3 text-5xl">{product.name}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">This product has no size and colour options yet. Please check back later.</p>
        <Link className="mt-6 inline-block underline underline-offset-4" to="/shop">Return to the shop</Link>
      </div>
    )
  }

  // key={slug}: opening another product starts with fresh selections and gallery.
  return <ProductDetailView key={product.slug} product={product} products={products} isDatabase={status === 'database'} />
}

function getRelatedProducts(products, current, limit = 4) {
  const others = products.filter((product) => product.slug !== current.slug)
  const sameSport = current.sport
    ? others.filter((product) => product.sport === current.sport)
    : []
  const sameCategory = others.filter((product) => product.category === current.category && !sameSport.includes(product))
  return [
    ...sameSport,
    ...sameCategory,
    ...others.filter((product) => product.category !== current.category),
  ].slice(0, limit)
}

function ProductDetailView({ product, products, isDatabase }) {
  const { name, category, brand, sport, style, price, originalPrice, badge, shortDescription, description, availableColors, availableSizes } = product

  // The first colour that still has stock is selected by default.
  const defaultColor = availableColors.find((color) => isColorAvailable(product, color.id)) ?? availableColors[0]
  const [colorId, setColorId] = useState(defaultColor.id)
  const [size, setSize] = useState(null) // the shopper must choose a size
  const [guideOpen, setGuideOpen] = useState(false)
  const { addItem } = useCart()
  const [bagMessage, setBagMessage] = useState(null) // { tone: 'success' | 'error', text }

  // Phase 4 (3D): which view is showing, which parts the loaded model supports, and the chosen preview colours.
  const [viewMode, setViewMode] = useState('photos') // 'photos' | '3d'
  const [supportedPartIds, setSupportedPartIds] = useState([])
  const [customColors, setCustomColors] = useState({}) // { partId: '#hex' }
  const handleMaterialsDetected = useCallback((ids) => setSupportedPartIds(ids), [])

  // Only parts that exist in the real model are offered for customising.
  const customizableParts = (product.customizableMaterials ?? []).filter((part) => supportedPartIds.includes(part.id))
  const showCustomizePanel = viewMode === '3d' && customizableParts.length > 0

  const color = availableColors.find((item) => item.id === colorId)
  const soldOutEverywhere = isSoldOut(product)
  const unavailableColorIds = availableColors.filter((item) => !isColorAvailable(product, item.id)).map((item) => item.id)
  const sizesInStock = getAvailableSizes(product, colorId)

  const onSale = typeof originalPrice === 'number' && originalPrice > price
  const badgeText = soldOutEverywhere ? 'SOLD OUT' : (badge ?? (onSale ? 'SALE' : null))

  // Choosing a colour keeps the chosen size only if that size exists in the new colour.
  function chooseColor(nextColorId) {
    setColorId(nextColorId)
    setBagMessage(null)
    if (size !== null && getStock(product, nextColorId, size) === 0) setSize(null)
  }

  // One sentence describing availability for the current selection (sample data only).
  let availabilityText
  let availabilityTone = 'neutral'
  if (soldOutEverywhere) {
    availabilityText = isDatabase ? 'Every size is sold out.' : 'Every size is sold out in this sample.'
    availabilityTone = 'bad'
  } else if (size !== null) {
    availabilityText = `Available in ${color.label}, UK ${size}${isDatabase ? '.' : ' (sample data).'}`
    availabilityTone = 'good'
  } else if (sizesInStock.length === 0) {
    availabilityText = `${color.label} is sold out${isDatabase ? '.' : ' in this sample.'} Try another colour.`
    availabilityTone = 'bad'
  } else {
    availabilityText = `${sizesInStock.length} of ${availableSizes.length} sizes available in ${color.label}${isDatabase ? '.' : ' (sample data).'} Select a size.`
  }

  const relatedProducts = getRelatedProducts(products, product, 4)

  // Needs a size first. Shows what happened in plain words (added, or why not).
  function handleAddToBag() {
    if (size === null) {
      setBagMessage({ tone: 'error', text: 'Please choose a size first.' })
      return
    }
    const { status } = addItem({ productId: product.id, colorId, size }, 1)
    if (status === 'added') setBagMessage({ tone: 'success', text: `Added ${name}, ${color.label}, UK ${size} to your bag.` })
    else if (status === 'quantity_limit') setBagMessage({ tone: 'error', text: 'You already have the maximum of 10 pairs of this size in your bag.' })
    else if (status === 'line_limit') setBagMessage({ tone: 'error', text: 'Your bag is full. Remove an item to add another style.' })
    else setBagMessage({ tone: 'error', text: 'We could not add that. Please choose a colour and size again.' })
  }

  return (
    <div className="container-page py-8 md:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Shop', to: '/shop' },
          { label: getCategoryLabel(category), to: `/shop?category=${category}${sport ? `&sport=${sport}` : ''}` },
          { label: name },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductMedia
            product={product}
            mode={viewMode}
            onModeChange={setViewMode}
            customColors={customColors}
            onMaterialsDetected={handleMaterialsDetected}
          />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow text-muted">{getCategoryLabel(category)}</p>
            {badgeText && (
              <span
                className={cn(
                  'eyebrow rounded-full px-2.5 py-1',
                  soldOutEverywhere ? 'bg-ink text-white' : 'bg-lime text-ink',
                )}
              >
                {badgeText}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-5xl sm:text-6xl">{name}</h1>
          {(brand || sport || style) && (
            <p className="mt-2 text-sm text-muted">
              {[brand, sport && `${sport} footwear`, style].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="mt-4 text-muted">{shortDescription}</p>

          <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-semibold">{formatPrice(price)}</span>
            {onSale && (
              <>
                <span className="text-base text-muted line-through">
                  <span className="sr-only">Original price </span>
                  {formatPrice(originalPrice)}
                </span>
                <span className="eyebrow text-ink">Save {formatPrice(originalPrice - price)}</span>
              </>
            )}
          </p>
          {!isDatabase && <p className="mt-1 text-xs text-muted">Sample catalogue price.</p>}

          <div className="mt-8 space-y-7 border-t border-line pt-8">
            <ColorSelector
              colors={availableColors}
              selectedId={colorId}
              onSelect={chooseColor}
              unavailableIds={unavailableColorIds}
            />

            <SizeSelector
              sizes={availableSizes}
              selectedSize={size}
              onSelect={(next) => {
                setSize(next)
                setBagMessage(null)
              }}
              isSizeAvailable={(candidate) => getStock(product, colorId, candidate) > 0}
            >
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] underline underline-offset-[6px] hover:decoration-2"
              >
                <Ruler size={14} aria-hidden="true" /> Size guide
              </button>
            </SizeSelector>

            <p
              role="status"
              className={cn(
                'rounded-lg border px-4 py-3 text-sm',
                availabilityTone === 'good' && 'border-ink bg-lime/40',
                availabilityTone === 'bad' && 'border-line bg-surface text-muted',
                availabilityTone === 'neutral' && 'border-line bg-surface',
              )}
            >
              {availabilityText}
            </p>
          </div>

          {showCustomizePanel && (
            <div className="mt-8">
              <CustomizePanel
                parts={customizableParts}
                colors={customColors}
                onChange={(partId, hex) => setCustomColors((previous) => ({ ...previous, [partId]: hex }))}
                onReset={() => setCustomColors({})}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToBag}
            disabled={soldOutEverywhere}
            className="mt-8 w-full rounded-full bg-ink px-6 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lime hover:text-ink disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/50 disabled:hover:bg-ink/15 disabled:hover:text-ink/50"
          >
            {soldOutEverywhere ? 'Sold out' : 'Add to bag'}
          </button>
          {bagMessage && (
            <p
              role={bagMessage.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'mt-3 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm',
                bagMessage.tone === 'success' ? 'border-ink bg-lime/40' : 'border-red-200 bg-red-50 text-red-900',
              )}
            >
              {bagMessage.tone === 'success' && <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
              <span>
                {bagMessage.text}{' '}
                {bagMessage.tone === 'success' && (
                  <Link to="/cart" className="font-semibold underline underline-offset-4">
                    View bag
                  </Link>
                )}
              </span>
            </p>
          )}
          <p className="mt-3 text-xs text-muted">
            {isDatabase
              ? 'Catalogue stock shown. Final availability is confirmed at checkout.'
              : 'Sample prices and stock. Final prices are confirmed at checkout.'}
          </p>

          <div className="mt-10 border-t border-line pt-8">
            <h2 className="text-2xl">About this pair</h2>
            <p className="mt-3 text-muted">{description}</p>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-20 border-t border-line pt-14">
          <SectionHeading eyebrow="Keep exploring" title="More sneakers" />
          <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((related) => (
              <li key={related.id}>
                <ProductCard product={related} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <SizeGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} highlightSize={size} />
    </div>
  )
}
