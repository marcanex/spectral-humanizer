import type { TextStats } from '../types'
import { fleschLabel } from '../lib/stats'

export function StatsPanel({
  before,
  after,
}: {
  before: TextStats
  after: TextStats | null
}) {
  const rows: { label: string; a: string | number; b?: string | number }[] = [
    { label: 'Words', a: before.words, b: after?.words },
    { label: 'Chars', a: before.chars, b: after?.chars },
    { label: 'Sentences', a: before.sentences, b: after?.sentences },
    { label: 'Avg length', a: before.avgSentenceLength, b: after?.avgSentenceLength },
    {
      label: 'Readability',
      a: `${before.flesch} (${fleschLabel(before.flesch)})`,
      b: after ? `${after.flesch} (${fleschLabel(after.flesch)})` : undefined,
    },
  ]

  return (
    <div className="panel p-4 space-y-3">
      <h3 className="font-display text-sm tracking-wide text-[var(--color-fog)]">Stats</h3>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--color-muted)]">Robotic score</span>
            <span>
              {before.roboticScore}
              {after ? ` → ${after.roboticScore}` : ''}
            </span>
          </div>
          <div className="score-bar mb-1">
            <span
              style={{
                width: `${before.roboticScore}%`,
                background: 'linear-gradient(90deg,#f97316,#c026d3)',
              }}
            />
          </div>
          {after && (
            <div className="score-bar">
              <span
                style={{
                  width: `${after.roboticScore}%`,
                  background: 'linear-gradient(90deg,#22d3ee,#a855f7)',
                }}
              />
            </div>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-1.5 text-xs">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-2">
              <dt className="text-[var(--color-muted)]">{r.label}</dt>
              <dd className="text-right">
                {r.a}
                {r.b !== undefined ? (
                  <span className="text-cyan-300/80"> → {r.b}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
