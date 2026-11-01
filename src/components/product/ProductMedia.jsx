import { useState } from 'react'
import ProductGallery from './ProductGallery.jsx'
import Shoe3DViewer from '../Shoe3DViewer.jsx'
import { has3DModel } from '../../data/products.js'
import { useModelAvailability } from '../../hooks/useModelAvailability.js'
import { canUseWebGL } from '../../utils/webgl.js'
import { cn } from '../../utils/cn.js'

// Decides what to show on the left of the product page:
//   - the photo gallery (always works), and
//   - an extra "3D view" option, but ONLY when this product has its own model, the model file exists,
//     and this browser supports WebGL.
// Whenever 3D is not possible, the gallery stays and a short note explains why.
//
//   mode: 'photos' | '3d'    onModeChange: called when the shopper switches
export default function ProductMedia({ product, mode, onModeChange, customColors, onMaterialsDetected }) {
  const hasModel = has3DModel(product)
  const availability = useModelAvailability(hasModel ? product.modelPath : null)
  const [webglSupported] = useState(() => canUseWebGL())
  const [viewerFailed, setViewerFailed] = useState(false)

  const canShow3D = hasModel && webglSupported && availability === 'available' && !viewerFailed
  const show3D = canShow3D && mode === '3d'

  // One short note for every case where 3D is not on offer.
  let note = null
  if (!hasModel) {
    note = '3D viewing is not available for this item yet.'
  } else if (!webglSupported) {
    note = '3D viewing needs WebGL, which this browser or device does not support. Showing photos instead.'
  } else if (viewerFailed) {
    note = 'The 3D view could not be loaded. Showing photos instead.'
  } else if (availability === 'missing') {
    note = '3D viewing is not available for this item yet.'
  }

  function handleViewerUnavailable() {
    setViewerFailed(true)
    onModeChange('photos')
  }

  const toggleClass = (active) =>
    cn(
      'rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors',
      active ? 'border-ink bg-lime text-ink' : 'border-line bg-surface text-muted hover:border-ink hover:text-ink',
    )

  return (
    <div>
      {canShow3D && (
        <div role="group" aria-label="Product view" className="mb-4 flex gap-2">
          <button type="button" aria-pressed={mode === 'photos'} onClick={() => onModeChange('photos')} className={toggleClass(mode === 'photos')}>
            Photos
          </button>
          <button type="button" aria-pressed={mode === '3d'} onClick={() => onModeChange('3d')} className={toggleClass(mode === '3d')}>
            3D view
          </button>
        </div>
      )}

      {show3D ? (
        <Shoe3DViewer
          modelPath={product.modelPath}
          label={product.name}
          modelRotation={product.modelRotation}
          materialConfig={product.customizableMaterials}
          colors={customColors}
          onMaterialsDetected={onMaterialsDetected}
          onUnavailable={handleViewerUnavailable}
        />
      ) : (
        <ProductGallery images={product.images} productName={product.name} />
      )}

      {note && (
        <p className="mt-3 text-xs text-muted">
          {note}
          {import.meta.env.DEV && hasModel && availability === 'missing' && (
            <span className="block">
              Developer note: no model file was found at <code>{product.modelPath}</code>. See public/models/README.md.
            </span>
          )}
        </p>
      )}
    </div>
  )
}
