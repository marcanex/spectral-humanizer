import { useMemo, useState } from 'react'
import type { HistoryEntry } from '../types'
import { Modal } from './Modal'
import { VOICE_LABELS, STRENGTH_LABELS } from '../types'

export function HistoryPanel({
  open,
  onClose,
  entries,
  onRestore,
  onDelete,
  onClear,
}: {
  open: boolean
  onClose: () => void
  entries: HistoryEntry[]
  onRestore: (e: HistoryEntry) => void
  onDelete: (id: string) => void
  onClear: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter(
      (e) =>
        e.input.toLowerCase().includes(needle) ||
        e.output.toLowerCase().includes(needle) ||
        (e.label || '').toLowerCase().includes(needle),
    )
  }, [entries, q])

  return (
    <Modal open={open} onClose={onClose} title="History" wide>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-black/40 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
            placeholder="Search history…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="btn btn-ghost text-xs" onClick={onClear} disabled={!entries.length}>
            Clear all
          </button>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] py-6 text-center">No entries yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[55vh] overflow-y-auto">
            {filtered.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-[var(--color-border)] bg-black/30 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--color-muted)]">
                  <span>
                    {new Date(e.createdAt).toLocaleString()} · {VOICE_LABELS[e.voice]} ·{' '}
                    {STRENGTH_LABELS[e.strength]}
                  </span>
                  <button
                    type="button"
                    className="text-orange-300/80 hover:text-orange-200"
                    onClick={() => onDelete(e.id)}
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-[var(--color-muted)] line-clamp-2">{e.input}</p>
                <p className="text-sm line-clamp-3 text-[var(--color-fog)]">{e.output}</p>
                <button type="button" className="btn btn-ghost text-xs" onClick={() => onRestore(e)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
