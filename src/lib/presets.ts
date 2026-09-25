import type { HumanizeParams, PresetId } from '../types'

/**
 * Presets are character recipes — not "more of the same soup".
 * Each emphasizes a different audible axis so A/B between presets is obvious.
 */
export const PRESET_PARAMS: Record<Exclude<PresetId, 'custom'>, HumanizeParams> = {
  // Barely there: clean polish, mix dialed down
  subtle: {
    jitter: 0.22,
    flutter: 0.0,
    dynamics: 0.18,
    noise: 0.04,
    warmth: 0.08,
    space: 0.06,
    transientSoft: 0.08,
    width: 0.12,
    mix: 0.45,
  },
  // Light groove + dynamics ride — the default demo polish
  natural: {
    jitter: 0.42,
    flutter: 0.12,
    dynamics: 0.48,
    noise: 0.1,
    warmth: 0.22,
    space: 0.14,
    transientSoft: 0.18,
    width: 0.28,
    mix: 0.62,
  },
  // Timing + warmth + air + a touch of room — worn-in tape feel
  'lived-in': {
    jitter: 0.62,
    flutter: 0.22,
    dynamics: 0.4,
    noise: 0.38,
    warmth: 0.55,
    space: 0.28,
    transientSoft: 0.32,
    width: 0.35,
    mix: 0.72,
  },
  // Darker tilt, wider image, grit + stage bloom — still listenable
  'spektor-stage': {
    jitter: 0.38,
    flutter: 0.28,
    dynamics: 0.55,
    noise: 0.18,
    warmth: 0.68,
    space: 0.48,
    transientSoft: 0.22,
    width: 0.7,
    mix: 0.78,
  },
}

export const PRESET_META: Record<
  Exclude<PresetId, 'custom'>,
  { label: string; blurb: string }
> = {
  subtle: {
    label: 'Subtle',
    blurb: 'Barely there — light micro-timing + soft dynamics. Mix ~45%.',
  },
  natural: {
    label: 'Natural',
    blurb: 'Groove + gain ride — human feel without dirt. Mix ~62%.',
  },
  'lived-in': {
    label: 'Lived-in',
    blurb: 'More timing, tape warmth, and room air. Mix ~72%.',
  },
  'spektor-stage': {
    label: 'Spektor Stage',
    blurb: 'Darker tilt, wider image, grit + stage bloom. Mix ~78%.',
  },
}

export function paramsEqual(a: HumanizeParams, b: HumanizeParams): boolean {
  return (Object.keys(a) as (keyof HumanizeParams)[]).every(
    (k) => Math.abs(a[k] - b[k]) < 0.001,
  )
}

export function matchPreset(params: HumanizeParams): PresetId {
  for (const id of Object.keys(PRESET_PARAMS) as Exclude<PresetId, 'custom'>[]) {
    if (paramsEqual(params, PRESET_PARAMS[id])) return id
  }
  return 'custom'
}
