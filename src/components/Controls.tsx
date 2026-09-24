import type { HumanizeOptions, Strength, Voice } from '../types'
import { STRENGTH_LABELS, VOICE_LABELS } from '../types'

const STRENGTHS: Strength[] = ['subtle', 'balanced', 'aggressive']
const VOICES: Voice[] = ['casual', 'professional', 'academic', 'creative', 'street']

export function Controls({
  options,
  onChange,
  busy,
  onHumanize,
  llmArmed,
}: {
  options: HumanizeOptions
  onChange: (next: HumanizeOptions) => void
  busy: boolean
  onHumanize: () => void
  llmArmed: boolean
}) {
  const strengthIdx = STRENGTHS.indexOf(options.strength)

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-sm tracking-wide text-[var(--color-fog)]">Engine</h3>
        <button
          type="button"
          className="btn btn-primary min-w-[140px]"
          onClick={onHumanize}
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="spinner" /> Humanizing…
            </>
          ) : (
            <>✦ Humanize{llmArmed ? ' + LLM' : ''}</>
          )}
        </button>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-[var(--color-muted)]">Strength</span>
          <span className="text-amber-300/90">{STRENGTH_LABELS[options.strength]}</span>
        </div>
        <input
          type="range"
          className="range-spectral"
          min={0}
          max={2}
          step={1}
          value={strengthIdx}
          onChange={(e) =>
            onChange({ ...options, strength: STRENGTHS[Number(e.target.value)] })
          }
          aria-label="Humanize strength"
        />
        <div className="flex justify-between text-[10px] text-[var(--color-muted)] mt-1">
          <span>Subtle</span>
          <span>Balanced</span>
          <span>Aggressive</span>
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--color-muted)] mb-2">Voice</p>
        <div className="flex flex-wrap gap-1.5">
          {VOICES.map((v) => (
            <button
              key={v}
              type="button"
              className={`chip ${options.voice === v ? 'active' : ''}`}
              onClick={() => onChange({ ...options, voice: v })}
            >
              {VOICE_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--color-muted)] mb-2">Hedges / softeners</p>
        <div className="flex flex-wrap gap-1.5">
          {(['less', 'same', 'more'] as const).map((h) => (
            <button
              key={h}
              type="button"
              className={`chip ${options.hedges === h ? 'active' : ''}`}
              onClick={() => onChange({ ...options, hedges: h })}
            >
              {h === 'less' ? 'Fewer' : h === 'more' ? 'More' : 'Keep'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--color-muted)] mb-2">Preserve</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['quotes', 'Quotes'],
              ['markdown', 'Markdown'],
              ['urls', 'URLs'],
              ['codeFences', 'Code fences'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip ${options.preserve[key] ? 'active' : ''}`}
              onClick={() =>
                onChange({
                  ...options,
                  preserve: { ...options.preserve, [key]: !options.preserve[key] },
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--color-muted)] mb-2">Variants</p>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={`chip ${options.variantCount === n ? 'active' : ''}`}
              onClick={() => onChange({ ...options, variantCount: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
