import { Modal } from './Modal'
import { EMPTY_STATE_HINTS } from '../lib/samples'

export function Onboarding({
  open,
  onClose,
  onTrySample,
}: {
  open: boolean
  onClose: () => void
  onTrySample: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Welcome to Spectral Humanizer">
      <div className="space-y-4 text-sm">
        <p className="text-[var(--color-fog)] leading-relaxed">
          Rewrite stiff or AI-sounding writing into natural prose — locally in your browser. Quality
          varies; always give the result a human edit pass.
        </p>
        <ol className="space-y-2 text-[var(--color-muted)] list-decimal list-inside">
          {EMPTY_STATE_HINTS.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" className="btn btn-primary" onClick={onTrySample}>
            Try sample AI text
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Start empty
          </button>
        </div>
      </div>
    </Modal>
  )
}
