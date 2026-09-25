export function Header({
  onOpenSettings,
  onOpenShortcuts,
  onOpenAbout,
}: {
  onOpenSettings: () => void
  onOpenShortcuts: () => void
  onOpenAbout: () => void
}) {
  return (
    <header className="border-b border-violet-500/20 bg-black/30 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-violet-700 shadow-[0_0_24px_rgba(249,115,22,0.35)] flex items-center justify-center shrink-0">
            <span className="font-display text-lg text-white">Σ</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl tracking-wide text-violet-50 truncate">
              Spectral Humanizer
            </h1>
            <p className="text-[11px] sm:text-xs text-violet-300/65 truncate">
              AI music detector &amp; humanizer — Spektor / THE ALKHEMYST toolkit
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <button type="button" className="btn btn-ghost !text-xs" onClick={onOpenAbout}>
            Limits
          </button>
          <button type="button" className="btn btn-ghost !text-xs" onClick={onOpenShortcuts}>
            Keys
          </button>
          <button type="button" className="btn btn-ghost !text-xs" onClick={onOpenSettings}>
            Settings
          </button>
        </nav>
      </div>
    </header>
  )
}
