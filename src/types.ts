export type PresetId = 'subtle' | 'natural' | 'lived-in' | 'spektor-stage' | 'custom'

export interface HumanizeParams {
  /** Micro-timing jitter 0–1 */
  jitter: number
  /** Subtle pitch drift / vibrato 0–1 */
  pitchDrift: number
  /** Dynamics variation / breathing gain 0–1 */
  dynamics: number
  /** Breath / room noise bed 0–1 */
  noise: number
  /** Soft saturation / warmth 0–1 */
  warmth: number
  /** Reverb / stereo space 0–1 */
  space: number
  /** Transient softening 0–1 */
  transientSoft: number
  /** Stereo width 0–1 */
  width: number
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
