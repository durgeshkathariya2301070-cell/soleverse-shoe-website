import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { sizeGuideRows, sizeGuideNote, measuringSteps } from '../../data/sizeGuide.js'
import { cn } from '../../utils/cn.js'

// Size guide in the browser's built-in <dialog> element. The browser itself provides the dark
// backdrop, traps keyboard focus inside, closes on Escape and returns focus to the button.
//   open: true/false      onClose: called when the dialog closes
//   highlightSize: the currently selected UK size (its table row is highlighted)
export default function SizeGuideDialog({ open, onClose, highlightSize }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="size-guide-title"
      onClose={onClose}
      // Clicking the dark backdrop (outside the white panel) closes the dialog.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      className="m-auto w-[min(94vw,38rem)] rounded-[var(--radius-card)] border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/60"
    >
      <div className="max-h-[85dvh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-muted">Sample guide</p>
            <h2 id="size-guide-title" className="mt-2 text-4xl">
              Size guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-ink/5"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-sm text-muted">{sizeGuideNote}</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[22rem] border-collapse text-left text-sm tabular-nums">
            <caption className="sr-only">Size conversion chart</caption>
            <thead>
              <tr className="border-b border-ink text-xs uppercase tracking-[0.1em] text-muted">
                <th scope="col" className="py-2 pr-4 font-semibold">UK / India</th>
                <th scope="col" className="py-2 pr-4 font-semibold">EU</th>
                <th scope="col" className="py-2 pr-4 font-semibold">US (men)</th>
                <th scope="col" className="py-2 font-semibold">Foot length</th>
              </tr>
            </thead>
            <tbody>
              {sizeGuideRows.map((row) => (
                <tr
                  key={row.uk}
                  className={cn('border-b border-line', row.uk === highlightSize && 'bg-lime font-semibold')}
                >
                  <th scope="row" className="py-2.5 pr-4 pl-2 font-semibold">{row.uk}</th>
                  <td className="py-2.5 pr-4">{row.eu}</td>
                  <td className="py-2.5 pr-4">{row.us}</td>
                  <td className="py-2.5">{row.footLengthCm} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 text-2xl">How to measure</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          {measuringSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </dialog>
  )
}
