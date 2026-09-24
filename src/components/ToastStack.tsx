import type { ToastMessage } from '../types'

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-enter panel px-4 py-3 text-sm flex items-start gap-3 ${
            t.type === 'error'
              ? 'border-orange-500/40'
              : t.type === 'success'
                ? 'border-cyan-400/30'
                : ''
          }`}
        >
          <span className="flex-1 text-fog">{t.text}</span>
          <button
            type="button"
            className="text-muted hover:text-white text-xs"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
