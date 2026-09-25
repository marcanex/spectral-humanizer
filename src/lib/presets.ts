import type { HumanizeParams, PresetId } from '../types'

export const PRESET_PARAMS: Record<Exclude<PresetId, 'custom'>, HumanizeParams> = {
  subtle: {
    jitter: 0.18,
    pitchDrift: 0.12,
    dynamics: 0.22,
    noise: 0.08,
    warmth: 0.2,
    space: 0.15,
    transientSoft: 0.15,
    width: 0.25,
  },
  natural: {
    jitter: 0.35,
    pitchDrift: 0.28,
    dynamics: 0.4,
    noise: 0.18,
    warmth: 0.35,
    space: 0.32,
    transientSoft: 0.3,
    width: 0.45,
  },
  'lived-in': {
    jitter: 0.55,
    pitchDrift: 0.42,
    dynamics: 0.58,
    noise: 0.32,
    warmth: 0.5,
    space: 0.48,
    transientSoft: 0.45,
    width: 0.6,
  },
  'spektor-stage': {
    jitter: 0.48,
    pitchDrift: 0.38,
    dynamics: 0.65,
    noise: 0.28,
    warmth: 0.62,
    space: 0.7,
    transientSoft: 0.4,
    width: 0.75,
  },
}

export const PRESET_META: Record<
  Exclude<PresetId, 'custom'>,
  { label: string; blurb: string }
> = {
  subtle: {
    label: 'Subtle',
    blurb: 'Light groove & air — polish without changing the vibe.',
  },
  natural: {
    label: 'Natural',
    blurb: 'Human micro-timing, dynamics, and warmth for demos.',
  },
  'lived-in': {
    label: 'Lived-in',
    blurb: 'Room noise, drift, and imperfect hits — worn-in feel.',
  },
  'spektor-stage': {
    label: 'Spektor Stage',
    blurb: 'Wide, warm, theatrical space — Alkhemyst stage energy.',
  },
}

export function paramsEqual(a: HumanizeParams, b: HumanizeParams): boolean {
  return (Object.keys(a) as (keyof HumanizeParams)[]).every((k) => Math.abs(a[k] - b[k]) < 0.001)
}

export function matchPreset(params: HumanizeParams): PresetId {
  for (const id of Object.keys(PRESET_PARAMS) as Exclude<PresetId, 'custom'>[]) {
    if (paramsEqual(params, PRESET_PARAMS[id])) return id
  }
  return 'custom'
}
