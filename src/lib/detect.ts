import type { DetectionFeature, DetectionResult } from '../types'
import { clamp, peakOf, rmsOf, toMono } from './audioUtils'

const CAVEAT =
  'Heuristic / educational only — not a forensic detector. Scores estimate patterns often seen in stiff synthetic renders (over-steady envelopes, sparse transients, limited dynamics, pitch lock). Real recordings and polished AI tracks both vary widely. Always trust your ears.'

function mean(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function variance(xs: number[], m = mean(xs)): number {
  if (xs.length < 2) return 0
  let s = 0
  for (const x of xs) s += (x - m) * (x - m)
  return s / (xs.length - 1)
}

function stddev(xs: number[]): number {
  return Math.sqrt(variance(xs))
}

function coeffVar(xs: number[]): number {
  const m = mean(xs)
  if (m < 1e-9) return 0
  return stddev(xs) / m
}

/** Spectral flatness of a magnitude spectrum frame (0 = tonal, 1 = noise-like). */
function spectralFlatness(mags: Float32Array): number {
  let logSum = 0
  let arith = 0
  let n = 0
  for (let i = 1; i < mags.length; i++) {
    const v = Math.max(mags[i]!, 1e-12)
    logSum += Math.log(v)
    arith += v
    n++
  }
  if (!n || arith < 1e-12) return 0
  const geo = Math.exp(logSum / n)
  return clamp(geo / (arith / n), 0, 1)
}

function computeSpectrumMags(frame: Float32Array): Float32Array {
  // Lightweight real DFT magnitude (small N for heuristics)
  const N = frame.length
  const half = (N / 2) | 0
  const out = new Float32Array(half)
  for (let k = 0; k < half; k++) {
    let re = 0
    let im = 0
    const w = (2 * Math.PI * k) / N
    for (let n = 0; n < N; n++) {
      const x = frame[n]!
      re += x * Math.cos(w * n)
      im -= x * Math.sin(w * n)
    }
    out[k] = Math.sqrt(re * re + im * im) / N
  }
  return out
}

/** Simple autocorrelation pitch period estimate (samples). Returns 0 if unclear. */
function estimatePeriod(frame: Float32Array, sr: number): number {
  const minP = Math.floor(sr / 800) // ~800 Hz
  const maxP = Math.min(Math.floor(sr / 60), frame.length - 2) // ~60 Hz
  if (maxP <= minP) return 0
  let best = 0
  let bestVal = -Infinity
  // Normalize by energy
  let energy = 0
  for (let i = 0; i < frame.length; i++) energy += frame[i]! * frame[i]!
  if (energy < 1e-10) return 0

  for (let lag = minP; lag <= maxP; lag++) {
    let sum = 0
    const lim = frame.length - lag
    for (let i = 0; i < lim; i++) sum += frame[i]! * frame[i + lag]!
    if (sum > bestVal) {
      bestVal = sum
      best = lag
    }
  }
  const corr = bestVal / energy
  return corr > 0.25 ? best : 0
}

function scoreFromCvInverse(cv: number, lowCv: number, highCv: number): number {
  // Lower CV → higher "synthetic" score
  if (cv <= lowCv) return 1
  if (cv >= highCv) return 0
  return 1 - (cv - lowCv) / (highCv - lowCv)
}

export function analyzeAudioBuffer(buffer: AudioBuffer): DetectionResult {
  const mono = toMono(buffer)
  const sr = buffer.sampleRate
  const durationSec = buffer.duration
  const winSec = 0.05
  const hopSec = 0.025
  const win = Math.max(64, Math.floor(sr * winSec))
  const hop = Math.max(32, Math.floor(sr * hopSec))

  const rmsWindows: number[] = []
  const zcrWindows: number[] = []
  const flatnessWindows: number[] = []
  const periods: number[] = []
  const onsetStrengths: number[] = []

  let prevRms = 0
  const fftN = 512

  for (let start = 0; start + win <= mono.length; start += hop) {
    const end = start + win
    const r = rmsOf(mono, start, end)
    rmsWindows.push(r)

    // ZCR
    let zc = 0
    for (let i = start + 1; i < end; i++) {
      if ((mono[i]! >= 0) !== (mono[i - 1]! >= 0)) zc++
    }
    zcrWindows.push(zc / win)

    // Spectral flatness on a centered subframe
    if (start % (hop * 4) === 0 && start + fftN <= mono.length) {
      const frame = mono.subarray(start, start + fftN)
      // Hann window copy
      const windowed = new Float32Array(fftN)
      for (let i = 0; i < fftN; i++) {
        const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftN - 1)))
        windowed[i] = frame[i]! * hann
      }
      flatnessWindows.push(spectralFlatness(computeSpectrumMags(windowed)))

      if (r > 0.01) {
        const p = estimatePeriod(windowed, sr)
        if (p > 0) periods.push(p)
      }
    }

    // Onset proxy: positive RMS derivative
    const onset = Math.max(0, r - prevRms)
    onsetStrengths.push(onset)
    prevRms = r
  }

  const peak = peakOf(mono)
  const globalRms = rmsOf(mono)
  const crest = peak / Math.max(globalRms, 1e-9)
  const crestDb = 20 * Math.log10(Math.max(crest, 1e-9))

  // Dynamic range of window RMS in dB
  const activeRms = rmsWindows.filter((r) => r > 0.001)
  let dynRangeDb = 0
  if (activeRms.length > 4) {
    const sorted = [...activeRms].sort((a, b) => a - b)
    const lo = sorted[Math.floor(sorted.length * 0.1)]!
    const hi = sorted[Math.floor(sorted.length * 0.9)]!
    dynRangeDb = 20 * Math.log10(Math.max(hi, 1e-9) / Math.max(lo, 1e-9))
  }

  // Silence gaps: runs below threshold
  const silenceThresh = Math.max(0.002, globalRms * 0.05)
  const gapLens: number[] = []
  let gap = 0
  for (const r of rmsWindows) {
    if (r < silenceThresh) {
      gap++
    } else if (gap > 2) {
      gapLens.push(gap)
      gap = 0
    } else {
      gap = 0
    }
  }
  if (gap > 2) gapLens.push(gap)

  // Envelope stability (AI music often over-steady sustaining layers)
  const envCv = coeffVar(activeRms.length ? activeRms : rmsWindows)
  const envelopeScore = scoreFromCvInverse(envCv, 0.12, 0.55)

  // Limited dynamics → synthetic
  const dynamicsScore = clamp(1 - (dynRangeDb - 6) / 24, 0, 1)

  // Crest factor: very low crest (~3–6 dB) can indicate limited peaks / heavy limiting consistency
  const crestScore = clamp(1 - (crestDb - 6) / 14, 0, 1)

  // Silence regularity — very uniform gap lengths
  let silenceScore = 0.3
  if (gapLens.length >= 3) {
    const gCv = coeffVar(gapLens)
    silenceScore = scoreFromCvInverse(gCv, 0.15, 0.8)
  } else if (gapLens.length === 0 && durationSec > 2) {
    // Continuous fill with no natural rests — mild synthetic cue for some AI beds
    silenceScore = 0.45
  }

  // Spectral flatness quirks: very low variance of flatness = static texture
  const flatMean = mean(flatnessWindows)
  const flatCv = coeffVar(flatnessWindows)
  const flatnessScore = clamp(
    0.4 * scoreFromCvInverse(flatCv, 0.1, 0.7) + 0.3 * (flatMean < 0.08 ? 0.7 : flatMean > 0.55 ? 0.5 : 0.3),
    0,
    1,
  )

  // Pitch / period stability — locked pitch can flag synthetic leads/vocals
  let pitchScore = 0.35
  if (periods.length >= 8) {
    const freqs = periods.map((p) => sr / p)
    const fCv = coeffVar(freqs)
    pitchScore = scoreFromCvInverse(fCv, 0.008, 0.06)
  }

  // Transient sparsity — few onsets relative to duration (stiff AI loops)
  const onsetPeaks = onsetStrengths.filter((o) => o > mean(onsetStrengths) * 2.5 + 0.005)
  const onsetsPerSec = onsetPeaks.length / Math.max(durationSec, 0.01)
  // Music often 1–8 onsets/sec; very low for busy tracks or extremely metronomic density quirks
  const transientScore = clamp(1 - (onsetsPerSec - 0.5) / 6, 0, 1) * 0.5
    + scoreFromCvInverse(coeffVar(onsetStrengths.filter((o) => o > 1e-5)), 0.4, 1.8) * 0.5

  // ZCR regularity
  const zcrCv = coeffVar(zcrWindows.filter((_, i) => (rmsWindows[i] ?? 0) > silenceThresh))
  const zcrScore = scoreFromCvInverse(zcrCv || 0, 0.15, 0.7)

  const features: DetectionFeature[] = [
    {
      id: 'envelope',
      label: 'Amplitude envelope stability',
      score: envelopeScore,
      weight: 1.3,
      detail: `Window RMS CV ${envCv.toFixed(3)} — over-steady levels often appear in AI renders.`,
    },
    {
      id: 'dynamics',
      label: 'Limited macro dynamics',
      score: dynamicsScore,
      weight: 1.2,
      detail: `~${dynRangeDb.toFixed(1)} dB active RMS range (10–90%).`,
    },
    {
      id: 'crest',
      label: 'Crest / peak headroom',
      score: crestScore,
      weight: 0.9,
      detail: `Crest factor ${crestDb.toFixed(1)} dB.`,
    },
    {
      id: 'silence',
      label: 'Silence / gap patterning',
      score: silenceScore,
      weight: 0.8,
      detail: gapLens.length
        ? `${gapLens.length} quiet gaps detected; regularity scored.`
        : 'Few distinct rests — continuous bed.',
    },
    {
      id: 'flatness',
      label: 'Spectral flatness quirks',
      score: flatnessScore,
      weight: 1.0,
      detail: `Mean flatness ${flatMean.toFixed(3)}, CV ${flatCv.toFixed(3)}.`,
    },
    {
      id: 'pitch',
      label: 'Pitch / period lock',
      score: pitchScore,
      weight: 1.1,
      detail: periods.length
        ? `${periods.length} pitched frames; stability scored.`
        : 'Insufficient pitched frames.',
    },
    {
      id: 'transients',
      label: 'Transient sparsity / uniformity',
      score: clamp(transientScore, 0, 1),
      weight: 1.2,
      detail: `~${onsetsPerSec.toFixed(2)} strong onsets/sec.`,
    },
    {
      id: 'zcr',
      label: 'Zero-crossing regularity',
      score: zcrScore,
      weight: 0.7,
      detail: `ZCR CV ${zcrCv.toFixed(3)}.`,
    },
  ]

  let wSum = 0
  let sSum = 0
  for (const f of features) {
    wSum += f.weight
    sSum += f.score * f.weight
  }
  const raw = wSum > 0 ? sSum / wSum : 0.5
  const score = Math.round(clamp(raw, 0, 1) * 100)

  let label: DetectionResult['label']
  if (score < 35) label = 'Likely natural'
  else if (score < 55) label = 'Mixed signals'
  else if (score < 75) label = 'Likely synthetic'
  else label = 'Strongly synthetic'

  return {
    score,
    label,
    features,
    durationSec,
    sampleRate: sr,
    channels: buffer.numberOfChannels,
    caveat: CAVEAT,
  }
}
