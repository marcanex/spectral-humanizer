import { useMemo } from 'react'
import { wordDiff } from '../lib/diff'

export function DiffView({ before, after }: { before: string; after: string }) {
  const chunks = useMemo(() => wordDiff(before, after), [before, after])

  if (!after) {
    return (
      <div className="panel p-4">
        <h3 className="font-display text-sm tracking-wide text-[var(--color-fog)] mb-2">Diff</h3>
        <p className="text-xs text-[var(--color-muted)]">Humanize to see what changed.</p>
      </div>
    )
  }

  return (
    <div className="panel p-4 space-y-2">
      <h3 className="font-display text-sm tracking-wide text-[var(--color-fog)]">Diff</h3>
      <p className="text-[10px] text-[var(--color-muted)]">
        <span className="diff-remove px-1">removed</span>{' '}
        <span className="diff-add px-1">added</span>
      </p>
      <div className="text-sm leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-sans">
        {chunks.map((c, i) => {
          if (c.type === 'equal') return <span key={i}>{c.value}</span>
          if (c.type === 'add')
            return (
              <span key={i} className="diff-add">
                {c.value}
              </span>
            )
          return (
            <span key={i} className="diff-remove">
              {c.value}
            </span>
          )
        })}
      </div>
    </div>
  )
}
