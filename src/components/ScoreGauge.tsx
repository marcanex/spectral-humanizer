import type { DetectionResult } from '../types'

export function ScoreGauge({ result }: { result: DetectionResult | null }) {
  const score = result?.score ?? 0
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c

  const color =
    score < 35 ? '#34d399' : score < 55 ? '#fbbf24' : score < 75 ? '#f97316' : '#f43f5e'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-full h-full gauge-ring">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="rgba(168,85,247,0.15)"
            strokeWidth="10"
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={result ? offset : c}
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold tabular-nums" style={{ color }}>
            {result ? score : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-violet-300/70">AI likelihood</div>
        </div>
      </div>
      <div className="text-center">
        <div className="font-display text-base text-violet-100">
          {result?.label ?? 'Awaiting analysis'}
        </div>
        <p className="text-xs text-violet-300/60 mt-1 max-w-[16rem]">
          Heuristic score for educational use — not a forensic detector.
        </p>
      </div>
    </div>
  )
}
