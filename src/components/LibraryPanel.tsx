import { useMemo, useState } from 'react'
import type { LibraryItem } from '../types'
import { Modal } from './Modal'

export function LibraryPanel({
  open,
  onClose,
  items,
  onUse,
  onDelete,
  onTogglePin,
}: {
  open: boolean
  onClose: () => void
  items: LibraryItem[]
  onUse: (item: LibraryItem) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt)
    if (!needle) return list
    return list.filter(
      (i) => i.title.toLowerCase().includes(needle) || i.text.toLowerCase().includes(needle),
    )
  }, [items, q])

  return (
    <Modal open={open} onClose={onClose} title="Library / snippets" wide>
      <div className="space-y-3">
        <input
          className="w-full bg-black/40 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
          placeholder="Search library…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] py-6 text-center">
            Save favorite outputs with ⌘/Ctrl+Shift+S.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[55vh] overflow-y-auto">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-[var(--color-border)] bg-black/30 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-sm">
                    {item.pinned ? '📌 ' : ''}
                    {item.title}
                  </h4>
                  <div className="flex gap-2 text-[10px]">
                    <button type="button" className="text-fog" onClick={() => onTogglePin(item.id)}>
                      {item.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      className="text-orange-300/80"
                      onClick={() => onDelete(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm line-clamp-4 text-[var(--color-fog)]">{item.text}</p>
                <button type="button" className="btn btn-ghost text-xs" onClick={() => onUse(item)}>
                  Use as output
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
