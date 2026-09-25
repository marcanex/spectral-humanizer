import type { AppSettings, AudioSession, HumanizeParams, PresetId } from '../types'
import { PRESET_PARAMS } from './presets'

const SETTINGS_KEY = 'spectral-humanizer:settings:v2'
const HISTORY_KEY = 'spectral-humanizer:history:v2'

export const DEFAULT_SETTINGS: AppSettings = {
  autoAnalyze: true,
  defaultPreset: 'natural',
  showSpectrogram: false,
  showFreqBars: true,
  reducedMotion: false,
  exportBitDepth: 16,
  accent: 'ember',
}

/** Migrate v1 params (pitchDrift, no mix) → v2 (flutter, mix). */
export function normalizeParams(raw: Partial<HumanizeParams> & { pitchDrift?: number }): HumanizeParams {
  const base = PRESET_PARAMS.natural
  return {
    jitter: raw.jitter ?? base.jitter,
    flutter: raw.flutter ?? (typeof raw.pitchDrift === 'number' ? raw.pitchDrift * 0.5 : base.flutter),
    dynamics: raw.dynamics ?? base.dynamics,
    noise: raw.noise ?? base.noise,
    warmth: raw.warmth ?? base.warmth,
    space: raw.space ?? base.space,
    transientSoft: raw.transientSoft ?? base.transientSoft,
    width: raw.width ?? base.width,
    mix: raw.mix ?? 0.65,
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export function loadHistory(): AudioSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AudioSession[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((s) => ({
      ...s,
      params: normalizeParams(s.params ?? {}),
    }))
  } catch {
    return []
  }
}

export function saveHistory(sessions: AudioSession[]): void {
  const trimmed = sessions.slice(0, 40)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
}

export function pushHistory(session: AudioSession): AudioSession[] {
  const prev = loadHistory().filter((s) => s.id !== session.id)
  const next = [session, ...prev]
  saveHistory(next)
  return next
}

export function defaultParams(preset: PresetId = 'natural'): HumanizeParams {
  if (preset === 'custom') return { ...PRESET_PARAMS.natural }
  return { ...PRESET_PARAMS[preset] }
}

/** Clear legacy text-humanizer keys if present */
export function purgeLegacyKeys(): void {
  const legacy = [
    'spectral-humanizer-settings',
    'spectral-humanizer-history',
    'spectral-humanizer-library',
    'spectral-humanizer:settings',
    'spectral-humanizer:history',
    'spectral-humanizer:library',
  ]
  for (const k of legacy) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
