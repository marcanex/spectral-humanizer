import type { HumanizeParams, PresetId } from '../types'

/**
 * Presets differ in character but ALL stay listenable / dry-first.
 * Mix caps: Subtle ~15%, Natural ~25%, Lived-in ~35%, Spektor ~40%.
 * No noise / Haas / wash reverb in any default.
 */
export const PRESET_PARAMS: Record<Exclude<PresetId, 'custom'>, HumanizeParams> = {
  // Almost dry — tiny timing, barely any dynamics
  subtle: {
    jitter: 0.28,
    flutter: 0.0,
    dynamics: 0.12,
    noise: 0.0,
    warmth: 0.05,
    space: 0.0,
    transientSoft: 0.05,
    width: 0.0,
    mix: 0.15,
  },
  // Light groove + soft dynamics ride — default polish
  natural: {
    jitter: 0.4,
    flutter: 0.0,
    dynamics: 0.32,
    noise: 0.0,
    warmth: 0.12,
    space: 0.0,
    transientSoft: 0.1,
    width: 0.08,
    mix: 0.25,
  },
  // More timing + mild warmth; optional whisper of early reflection
  'lived-in': {
    jitter: 0.55,
    flutter: 0.0,
    dynamics: 0.28,
    noise: 0.0,
    warmth: 0.32,
    space: 0.18,
    transientSoft: 0.16,
    width: 0.12,
    mix: 0.35,
  },
  // Darker shelf + slight width + mild grit; flutter barely on
  'spektor-stage': {
    jitter: 0.36,
    flutter: 0.18,
    dynamics: 0.38,
    noise: 0.0,
    warmth: 0.48,
    space: 0.22,
    transientSoft: 0.12,
    width: 0.28,
    mix: 0.4,
  },
}

export const PRESET_META: Record<
  Exclude<PresetId, 'custom'>,
  { label: string; blurb: string }
> = {
  subtle: {
    label: 'Subtle',
    blurb: 'Almost dry — tiny micro-timing. Mix ~15%.',
  },
  natural: {
    label: 'Natural',
    blurb: 'Light timing + soft dynamics ride. Mix ~25%.',
  },
  'lived-in': {
    label: 'Lived-in',
    blurb: 'More timing + mild warmth; whisper of room. Mix ~35%.',
  },
  'spektor-stage': {
    label: 'Spektor Stage',
    blurb: 'Darker tilt, slight width, mild grit. Mix ~40% — still clean.',
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
