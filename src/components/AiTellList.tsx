import type { AiTellMatch } from '../types'

export function AiTellList({ tells }: { tells: AiTellMatch[] }) {
  const total = tells.reduce((s, t) => s + t.count, 0)
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-wide text-[var(--color-fog)]">AI-tell scanner</h3>
        <span className="text-xs text-[var(--color-muted)]">{total} hit{total === 1 ? '' : 's'}</span>
      </div>
      {tells.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)]">No common AI patterns detected. Nice.</p>
      ) : (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
          {tells.map((t) => (
            <li
              key={t.phrase}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 bg-black/30 border border-[var(--color-border)]"
            >
              <span>
                <span className="text-magenta-200 tell-mark px-0.5">&ldquo;{t.phrase}&rdquo;</span>
                <span className="ml-2 text-[var(--color-muted)]">{t.category}</span>
              </span>
              <span className="font-mono text-amber-300/90">×{t.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
