export type PresetId = 'subtle' | 'natural' | 'lived-in' | 'spektor-stage' | 'custom'

export interface HumanizeParams {
  /** Micro-timing jitter 0–1 — sample-delay groove, not pitch warble */
  jitter: number
  /** Gentle delay-line flutter (chorus-ish) 0–1 — NOT rate-resample pitch */
  flutter: number
  /** Dynamics ride / soft compression breathe 0–1 */
  dynamics: number
  /** Unused in engine (UI compat) — air/noise removed to keep chain clean */
  noise: number
  /** Soft saturation / warmth 0–1 */
  warmth: number
  /** Tiny early reflection 0–1 — ≤5% wet, no convolver */
  space: number
  /** Transient softening 0–1 */
  transientSoft: number
  /** Stereo mid-side width 0–1 — mono-safe, no Haas */
  width: number
  /** Dry/wet mix master 0–1 — dial intensity without changing character */
  mix: number
}

export interface DetectionFeature {
  id: string
  label: string
  score: number
  weight: number
  detail: string
}

export interface DetectionResult {
  /** 0–100 heuristic AI-likelihood */
  score: number
  label: 'Likely natural' | 'Mixed signals' | 'Likely synthetic' | 'Strongly synthetic'
  features: DetectionFeature[]
  /** Plain-English why this track scored high/low from measured features */
  rationale: string
  durationSec: number
  sampleRate: number
  channels: number
  caveat: string
}

export interface AudioSession {
  id: string
  name: string
  createdAt: number
  durationSec: number
  sampleRate: number
  channels: number
  detectionScore: number | null
  preset: PresetId
  params: HumanizeParams
  /** original file size bytes */
  sizeBytes: number
  mimeType: string
}

export interface QueueItem {
  id: string
  file: File
  status: 'pending' | 'analyzing' | 'ready' | 'processing' | 'done' | 'error'
  error?: string
  detection?: DetectionResult
  originalBuffer?: AudioBuffer
  humanizedBuffer?: AudioBuffer
}

export interface AppSettings {
  autoAnalyze: boolean
  defaultPreset: PresetId
  showSpectrogram: boolean
  showFreqBars: boolean
  reducedMotion: boolean
  exportBitDepth: 16 | 32
  accent: 'ember' | 'violet' | 'cyan'
}

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'success' | 'warn' | 'error'
}
