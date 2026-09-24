export function Header({
  onOpenSettings,
  onOpenShortcuts,
  onOpenBatch,
  onOpenHistory,
  onOpenLibrary,
}: {
  onOpenSettings: () => void
  onOpenShortcuts: () => void
  onOpenBatch: () => void
  onOpenHistory: () => void
  onOpenLibrary: () => void
}) {
  return (
    <header className="border-b border-[var(--color-border)] bg-black/30 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#c026d3)',
              boxShadow: '0 0 20px rgba(168,85,247,0.4)',
            }}
            aria-hidden
          >
            <span className="text-amber-300 text-lg">✦</span>
          </div>
          <div className="min-w-0">
            <h1
              className="font-display text-lg md:text-xl tracking-wide glitch truncate"
              data-text="Spectral Humanizer"
            >
              Spectral Humanizer
            </h1>
            <p className="text-xs text-[var(--color-muted)] truncate hidden sm:block">
              Strip the machine voice. Keep the meaning.
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1.5 flex-wrap justify-end">
          <button type="button" className="btn btn-ghost text-xs px-2.5 py-1.5" onClick={onOpenHistory}>
            History
          </button>
          <button type="button" className="btn btn-ghost text-xs px-2.5 py-1.5" onClick={onOpenLibrary}>
            Library
          </button>
          <button type="button" className="btn btn-ghost text-xs px-2.5 py-1.5" onClick={onOpenBatch}>
            Batch
          </button>
          <button type="button" className="btn btn-ghost text-xs px-2.5 py-1.5" onClick={onOpenShortcuts}>
            ⌨
          </button>
          <button type="button" className="btn btn-ghost text-xs px-2.5 py-1.5" onClick={onOpenSettings}>
            Settings
          </button>
        </nav>
      </div>
    </header>
  )
}
