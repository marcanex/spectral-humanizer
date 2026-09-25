import type { HumanizeParams, PresetId } from '../types'
import { PRESET_META, PRESET_PARAMS, matchPreset } from '../lib/presets'

const SLIDERS: { key: keyof HumanizeParams; label: string; hint: string }[] = [
  { key: 'jitter', label: 'Groove / micro-timing', hint: 'Slight timing wobble between grains' },
  { key: 'pitchDrift', label: 'Pitch drift', hint: 'Slow detune wander — less pitch-locked' },
  { key: 'dynamics', label: 'Dynamics breathe', hint: 'Macro gain motion & micro variation' },
  { key: 'transientSoft', label: 'Transient feel', hint: 'Soften stiff / overly sharp attacks' },
  { key: 'warmth', label: 'Warmth / saturation', hint: 'Gentle tape-ish soft clip' },
  { key: 'noise', label: 'Air / noise bed', hint: 'Subtle pink noise room air' },
  { key: 'space', label: 'Space / reverb', hint: 'Short stage bloom' },
  { key: 'width', label: 'Stereo width', hint: 'Haas + mid/side width' },
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESET_META) as Exclude<PresetId, 'custom'>[]).map((id) => {
          const meta = PRESET_META[id]
          const on = active === id
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              title={meta.blurb}
              className={`btn text-xs !px-3 !py-1.5 ${on ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onChange({ ...PRESET_PARAMS[id] })}
            >
              {meta.label}
            </button>
          )
        })}
        {active === 'custom' && (
          <span className="text-xs self-center text-orange-300/80 font-medium">Custom</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SLIDERS.map((s) => (
          <label key={s.key} className="block rounded-lg border border-violet-500/10 bg-black/20 px-3 py-2">
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
              disabled={disabled}
              value={params[s.key]}
              onChange={(e) =>
                onChange({ ...params, [s.key]: Number(e.target.value) })
              }
              aria-label={s.label}
            />
            <p className="text-[10px] text-violet-300/45 mt-1">{s.hint}</p>
          </label>
        ))}
      </div>
    </div>
  )
}
