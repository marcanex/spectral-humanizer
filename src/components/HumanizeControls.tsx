import type { HumanizeParams, PresetId } from '../types'
import { PRESET_META, PRESET_PARAMS, matchPreset } from '../lib/presets'

const SLIDERS: { key: keyof HumanizeParams; label: string; hint: string }[] = [
  {
    key: 'mix',
    label: 'Dry / Wet mix',
    hint: '0% = exact original. Scales color FX depth (timing stays time-aligned — no comb filter)',
  },
  {
    key: 'jitter',
    label: 'Groove / micro-timing',
    hint: 'Smooth sample-delay wander (≤ ~3 ms) — timing only, no pitch warble',
  },
  {
    key: 'flutter',
    label: 'Flutter / chorus',
    hint: 'Short modulated delay blend — OFF by default; use sparingly',
  },
  {
    key: 'dynamics',
    label: 'Dynamics ride',
    hint: 'Very light upward gain ride + soft breathe on flat beds',
  },
  {
    key: 'transientSoft',
    label: 'Transient soften',
    hint: 'Ease overly sharp / stiff attacks only',
  },
  {
    key: 'warmth',
    label: 'Warmth / saturation',
    hint: 'Barely-above-unity soft clip + mild HF darkening',
  },
  {
    key: 'noise',
    label: 'Air / noise bed',
    hint: 'Disabled in engine (kept for UI) — was a hiss/mud culprit',
  },
  {
    key: 'space',
    label: 'Space / room',
    hint: 'Tiny early reflection only (≤5% wet) — no convolver wash',
  },
  {
    key: 'width',
    label: 'Stereo width',
    hint: 'Proper mid-side widen — mono-safe, no Haas',
  },
]

export function HumanizeControls({
  params,
  onChange,
  disabled,
}: {
  params: HumanizeParams
  onChange: (next: HumanizeParams) => void
  disabled?: boolean
}) {
  const active = matchPreset(params)
  const meta = active !== 'custom' ? PRESET_META[active] : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESET_META) as Exclude<PresetId, 'custom'>[]).map((id) => {
          const m = PRESET_META[id]
          const on = active === id
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              title={m.blurb}
              className={`btn text-xs !px-3 !py-1.5 ${on ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onChange({ ...PRESET_PARAMS[id] })}
            >
              {m.label}
            </button>
          )
        })}
        {active === 'custom' && (
          <span className="text-xs self-center text-orange-300/80 font-medium">Custom</span>
        )}
        <button
          type="button"
          disabled={disabled}
          title="Set mix to 0% — true bypass equals original"
          className="btn btn-ghost text-xs !px-3 !py-1.5 ml-auto"
          onClick={() => onChange({ ...params, mix: 0 })}
        >
          Bypass (0% mix)
        </button>
      </div>

      {meta && (
        <p className="text-xs text-violet-200/75 leading-relaxed rounded-lg border border-violet-500/15 bg-violet-950/30 px-3 py-2">
          <span className="font-semibold text-orange-300/90">{meta.label}:</span> {meta.blurb}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {SLIDERS.map((s) => (
          <label
            key={s.key}
            className={`block rounded-lg border px-3 py-2 ${
              s.key === 'mix'
                ? 'border-orange-500/30 bg-orange-500/5 sm:col-span-2'
                : s.key === 'noise'
                  ? 'border-violet-500/10 bg-black/20 opacity-60'
                  : 'border-violet-500/10 bg-black/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-violet-100">{s.label}</span>
              <span className="text-[10px] font-mono text-orange-300/90 tabular-nums">
                {Math.round(params[s.key] * 100)}
              </span>
            </div>
            <input
              className="slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              disabled={disabled || s.key === 'noise'}
              value={params[s.key]}
              onChange={(e) => onChange({ ...params, [s.key]: Number(e.target.value) })}
              aria-label={s.label}
            />
            <p className="text-[10px] text-violet-300/45 mt-1">{s.hint}</p>
          </label>
        ))}
      </div>
    </div>
  )
}
