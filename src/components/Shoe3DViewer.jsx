import { Component, Suspense, lazy, useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '../utils/cn.js'

// The 3D scene (and Three.js with it) is only downloaded when this component is first shown.
const Shoe3DScene = lazy(() => import('./Shoe3DScene.jsx'))

// Catches any crash inside the 3D part (a broken model, a missing library, a lost graphics context)
// so it can never take down the rest of the page.
class ViewerErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    this.props.onError(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

const controlButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink shadow-soft transition-colors hover:bg-lime disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface'

// Reusable 3D viewer. It knows nothing about specific products: everything comes in through props.
//   modelPath          URL of the .glb file
//   label              product name, used in accessible labels
//   modelRotation      optional [x, y, z] radians
//   materialConfig     [{ id, label, materialName }] parts that may be recoloured
//   colors             { partId: '#hex' } chosen colours
//   onMaterialsDetected(ids)  called with the parts this model really supports
//   onUnavailable()    called when the shopper chooses "Show photos instead" after a failure
export default function Shoe3DViewer({
  modelPath,
  label,
  modelRotation,
  materialConfig,
  colors,
  onMaterialsDetected,
  onUnavailable,
}) {
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [command, setCommand] = useState(null)

  const handleReady = useCallback(() => setStatus('ready'), [])
  const handleError = useCallback((error) => {
    console.error('[Shoe3DViewer] could not show the 3D model:', error)
    setStatus('error')
  }, [])

  const send = (name) => setCommand((previous) => ({ name, id: (previous?.id ?? 0) + 1 }))
  const isReady = status === 'ready'

  return (
    <section aria-label={`Interactive 3D view of ${label}`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-line bg-[#ecece6] sm:aspect-square">
        {status !== 'error' && (
          <ViewerErrorBoundary key={modelPath} onError={handleError}>
            <Suspense fallback={null}>
              <Shoe3DScene
                modelPath={modelPath}
                modelRotation={modelRotation}
                materialConfig={materialConfig}
                colors={colors}
                command={command}
                onMaterialsDetected={onMaterialsDetected}
                onReady={handleReady}
                onError={handleError}
              />
            </Suspense>
          </ViewerErrorBoundary>
        )}

        {status === 'loading' && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#ecece6]">
            <span
              aria-hidden="true"
              className="h-8 w-8 rounded-full border-2 border-ink/20 border-t-ink motion-safe:animate-spin"
            />
            <p className="eyebrow text-muted">Loading 3D model</p>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="font-display text-2xl font-extrabold uppercase" style={{ fontStretch: '85%' }}>
              3D view unavailable
            </p>
            <p className="max-w-xs text-sm text-muted">
              The 3D model could not be loaded. The rest of this page still works, and you can look at the photos instead.
            </p>
            <button
              type="button"
              onClick={onUnavailable}
              className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lime hover:text-ink"
            >
              Show photos instead
            </button>
          </div>
        )}

        {status !== 'error' && (
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2" role="group" aria-label="3D view controls">
            <button type="button" className={controlButtonClass} disabled={!isReady} onClick={() => send('rotate-left')} aria-label="Rotate left">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" className={controlButtonClass} disabled={!isReady} onClick={() => send('rotate-right')} aria-label="Rotate right">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className={controlButtonClass} disabled={!isReady} onClick={() => send('zoom-in')} aria-label="Zoom in">
              <Plus size={18} aria-hidden="true" />
            </button>
            <button type="button" className={controlButtonClass} disabled={!isReady} onClick={() => send('zoom-out')} aria-label="Zoom out">
              <Minus size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(controlButtonClass, 'w-auto gap-1.5 px-4 text-xs font-semibold uppercase tracking-[0.1em]')}
              disabled={!isReady}
              onClick={() => send('reset')}
            >
              <RotateCcw size={16} aria-hidden="true" /> Reset view
            </button>
          </div>
        )}
      </div>

      {status !== 'error' && (
        <p className="mt-3 text-xs text-muted">
          Drag to rotate, scroll or pinch to zoom, or use the buttons. On a phone, drag with one finger on the shoe.
        </p>
      )}
    </section>
  )
}
