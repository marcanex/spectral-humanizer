import { useEffect, type ReactNode } from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header flex items-center justify-between px-5 py-3">
          <h2 className="font-display text-lg tracking-wide text-violet-100">{title}</h2>
          <button type="button" className="btn btn-ghost !py-1 !px-2" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-5 text-sm text-violet-100/90 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
