import { Modal } from './Modal'

const ROWS = [
  ['⌘/Ctrl + Enter', 'Humanize'],
  ['⌘/Ctrl + Shift + C', 'Copy output'],
  ['⌘/Ctrl + Shift + S', 'Save to library'],
  ['⌘/Ctrl + Shift + H', 'Toggle history'],
  ['⌘/Ctrl + ,', 'Settings'],
  ['⌘/Ctrl + /', 'Shortcuts cheat sheet'],
  ['Esc', 'Close modal'],
]

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <ul className="space-y-2 text-sm">
        {ROWS.map(([keys, action]) => (
          <li
            key={keys}
            className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-border)]"
          >
            <span className="text-[var(--color-fog)]">{action}</span>
            <kbd className="font-mono text-xs px-2 py-1 rounded-md bg-black/50 border border-[var(--color-border)] text-amber-200/90">
              {keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
