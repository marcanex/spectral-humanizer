import type { DetectionFeature } from '../types'

export function FeatureList({ features }: { features: DetectionFeature[] }) {
  if (!features.length) {
    return (
      <p className="text-sm text-violet-300/50 italic">
        Upload a track and analyze to see envelope, dynamics, transient, and spectral cues.
      </p>
    )
  }

  return (
    <ul className="space-y-2.5">
      {features.map((f) => (
        <li key={f.id} className="rounded-lg border border-violet-500/15 bg-black/25 px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-violet-50">{f.label}</span>
            <span className="text-xs font-mono text-orange-300 tabular-nums">
              {(f.score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-violet-950 overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-orange-500"
              style={{ width: `${Math.round(f.score * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-violet-300/55 leading-snug">{f.detail}</p>
        </li>
      ))}
    </ul>
  )
}
