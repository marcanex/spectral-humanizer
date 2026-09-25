import type { DetectionFeature, DetectionResult } from '../types'
import { clamp, peakOf, rmsOf, toMono } from './audioUtils'

const CAVEAT =
  'Educational heuristic — not a forensic or commercial detector. Scores reflect measurable patterns (steady envelopes, limited dynamics, sparse rests, pitch lock) that often appear in stiff synthetic renders. Live recordings, heavy mastering, and polished AI tracks all vary. Trust your ears; never treat this as proof.'

function mean(xs: number[]): number {
  if (!xs.length) return 0
  let s = 0
  for (const x of xs) s += x
  return s / xs.length
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
  if (Math.abs(m) < 1e-9) return 0
  return stddev(xs) / Math.abs(m)
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const i = clamp(p, 0, 1) * (sorted.length - 1)
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]!
  return sorted[lo]! * (1 - (i - lo)) + sorted[hi]! * (i - lo)
}

/** Geometric/arithmetic mean flatness of magnitude spectrum (0 tonal → 1 noise). */
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
  return clamp(Math.exp(logSum / n) / (arith / n), 0, 1)
}

/** Band energy ratio: high (5k+) / mid (500–2k) — room air & hiss show up here. */
function bandEnergies(
  mags: Float32Array,
  sr: number,
): { low: number; mid: number; high: number } {
  const binHz = sr / (mags.length * 2)
  let low = 0,
    mid = 0,
    high = 0
  for (let i = 1; i < mags.length; i++) {
    const hz = i * binHz
    const e = mags[i]! * mags[i]!
    if (hz < 250) low += e
    else if (hz < 2500) mid += e
    else if (hz < 12000) high += e
  }
  return { low, mid, high }
}

/**
 * Real DFT magnitudes for small frames. Fine for heuristics; N stays ≤ 512.
 */
function computeSpectrumMags(frame: Float32Array): Float32Array {
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

function estimatePeriod(frame: Float32Array, sr: number): number {
  const minP = Math.floor(sr / 700)
  const maxP = Math.min(Math.floor(sr / 70), frame.length - 2)
  if (maxP <= minP) return 0
  let energy = 0
  for (let i = 0; i < frame.length; i++) energy += frame[i]! * frame[i]!
  if (energy < 1e-10) return 0

  let best = 0
  let bestVal = -Infinity
  for (let lag = minP; lag <= maxP; lag++) {
    let sum = 0
    const lim = frame.length - lag
    for (let i = 0; i < lim; i++) sum += frame[i]! * frame[i + lag]!
    if (sum > bestVal) {
      bestVal = sum
      best = lag
    }
  }
  return bestVal / energy > 0.28 ? best : 0
}

/** Map low CV → high synthetic score with soft knees. */
function scoreLowCv(cv: number, low: number, high: number): number {
  if (cv <= low) return 1
  if (cv >= high) return 0
  return 1 - (cv - low) / (high - low)
}

function buildRationale(
  score: number,
  label: DetectionResult['label'],
  features: DetectionFeature[],
  stats: {
    dynRangeDb: number
    crestDb: number
    envCv: number
    gapCount: number
    hfVar: number
    onsetsPerSec: number
  },
): string {
  const ranked = [...features].sort((a, b) => b.score * b.weight - a.score * a.weight)
  const topHigh = ranked.filter((f) => f.score >= 0.55).slice(0, 3)
  const topLow = [...features].filter((f) => f.score <= 0.35).slice(0, 2)

  const bits: string[] = []

  if (score >= 70) {
    bits.push(
      `Score ${score} (${label}): several cues look stiff / overly controlled.`,
    )
  } else if (score >= 55) {
    bits.push(
      `Score ${score} (${label}): some synthetic-leaning patterns, not decisive.`,
    )
  } else if (score >= 35) {
    bits.push(
      `Score ${score} (${label}): mixed — some natural motion, some steadiness.`,
    )
  } else {
    bits.push(
      `Score ${score} (${label}): measured variation looks more like a live or loose take.`,
    )
  }

  if (topHigh.length) {
    bits.push(
      'Pushing the score up: ' +
        topHigh.map((f) => f.label.toLowerCase()).join('; ') +
        '.',
    )
  }
  if (topLow.length && score < 70) {
    bits.push(
      'Pulling it down: ' +
        topLow.map((f) => f.label.toLowerCase()).join('; ') +
        '.',
    )
  }

  // Concrete measured anchors so bars feel tied to content
  bits.push(
    `Measured: ~${stats.dynRangeDb.toFixed(1)} dB active dynamics, crest ${stats.crestDb.toFixed(1)} dB, envelope CV ${stats.envCv.toFixed(2)}, ${stats.gapCount} quiet gaps, ~${stats.onsetsPerSec.toFixed(1)} onsets/s, HF energy variance ${stats.hfVar.toFixed(3)}.`,
  )

  return bits.join(' ')
}

export function analyzeAudioBuffer(buffer: AudioBuffer): DetectionResult {
  const mono = toMono(buffer)
  const sr = buffer.sampleRate
  const durationSec = buffer.duration
  const winSec = 0.046
  const hopSec = 0.023
  const win = Math.max(64, Math.floor(sr * winSec))
  const hop = Math.max(32, Math.floor(sr * hopSec))

  const rmsWindows: number[] = []
  const zcrWindows: number[] = []
  const flatnessWindows: number[] = []
  const hfRatios: number[] = []
  const periods: number[] = []
  const onsetStrengths: number[] = []

  let prevRms = 0
  const fftN = 512

  // Stereo correlation (if stereo) — overly correlated / identical L/R can hint at mono-upmix AI beds
  let stereoCorr = 1
  if (buffer.numberOfChannels >= 2) {
    const L = buffer.getChannelData(0)
    const R = buffer.getChannelData(1)
    let dot = 0,
      eL = 0,
      eR = 0
    const step = Math.max(1, Math.floor(L.length / 80000))
    for (let i = 0; i < L.length; i += step) {
      const a = L[i]!
      const b = R[i]!
      dot += a * b
      eL += a * a
      eR += b * b
    }
    const denom = Math.sqrt(eL * eR)
    stereoCorr = denom > 1e-12 ? clamp(dot / denom, -1, 1) : 1
  }

  for (let start = 0; start + win <= mono.length; start += hop) {
    const end = start + win
    const r = rmsOf(mono, start, end)
    rmsWindows.push(r)

    let zc = 0
    for (let i = start + 1; i < end; i++) {
      if (mono[i]! >= 0 !== mono[i - 1]! >= 0) zc++
    }
    zcrWindows.push(zc / win)

    // Spectral analysis every 4th hop for speed
    if (start % (hop * 4) === 0 && start + fftN <= mono.length) {
      const frame = mono.subarray(start, start + fftN)
      const windowed = new Float32Array(fftN)
      for (let i = 0; i < fftN; i++) {
        const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftN - 1)))
        windowed[i] = frame[i]! * hann
      }
      const mags = computeSpectrumMags(windowed)
      flatnessWindows.push(spectralFlatness(mags))
      const bands = bandEnergies(mags, sr)
      const hf = bands.high / Math.max(bands.mid + bands.high, 1e-12)
      hfRatios.push(hf)

      if (r > 0.008) {
        const p = estimatePeriod(windowed, sr)
        if (p > 0) periods.push(p)
      }
    }

    onsetStrengths.push(Math.max(0, r - prevRms))
    prevRms = r
  }

  const peak = peakOf(mono)
  const globalRms = rmsOf(mono)
  const crest = peak / Math.max(globalRms, 1e-9)
  const crestDb = 20 * Math.log10(Math.max(crest, 1e-9))

  const activeRms = rmsWindows.filter((r) => r > 0.0015)
  let dynRangeDb = 0
  if (activeRms.length > 8) {
    const sorted = [...activeRms].sort((a, b) => a - b)
    const lo = percentile(sorted, 0.1)
    const hi = percentile(sorted, 0.9)
    dynRangeDb = 20 * Math.log10(Math.max(hi, 1e-9) / Math.max(lo, 1e-9))
  }

  // Silence / rest gaps
  const silenceThresh = Math.max(0.0015, globalRms * 0.04)
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

  // --- Feature scores (designed to spread with content) ---

  const envCv = coeffVar(activeRms.length ? activeRms : rmsWindows)
  // Flat AI beds often CV ~0.08–0.25; live/dynamic ~0.35–0.9+
  const envelopeScore = scoreLowCv(envCv, 0.1, 0.65)

  // Loudness-normalized AI: often 4–12 dB 10–90; live rock/jazz 15–35+
  const dynamicsScore = clamp(1 - (dynRangeDb - 5) / 28, 0, 1)

  // Heavy limiting / flat peaks → low crest
  const crestScore = clamp(1 - (crestDb - 5) / 16, 0, 1)

  let silenceScore = 0.4
  if (gapLens.length >= 3) {
    const gCv = coeffVar(gapLens)
    // Uniform loop rests → high; irregular live rests → low
    silenceScore = scoreLowCv(gCv, 0.12, 0.95)
  } else if (gapLens.length === 0 && durationSec > 3) {
    // Continuous wall-to-wall fill — mild synthetic cue
    silenceScore = 0.62
  } else if (gapLens.length === 1 || gapLens.length === 2) {
    silenceScore = 0.35
  }

  const flatMean = mean(flatnessWindows)
  const flatCv = coeffVar(flatnessWindows)
  // Static texture (low flatness CV) leans synthetic; evolving noise/air leans natural
  const flatnessScore = clamp(
    0.55 * scoreLowCv(flatCv, 0.08, 0.75) +
      0.25 * (flatMean < 0.05 ? 0.75 : flatMean > 0.45 ? 0.4 : 0.35) +
      0.2 * (flatMean > 0.02 && flatMean < 0.12 ? 0.55 : 0.3),
    0,
    1,
  )

  let pitchScore = 0.28
  if (periods.length >= 10) {
    const freqs = periods.map((p) => sr / p)
    const fCv = coeffVar(freqs)
    // Very locked pitch (CV < 1%) common in quantized synth leads
    pitchScore = scoreLowCv(fCv, 0.006, 0.08)
  } else if (periods.length === 0) {
    pitchScore = 0.22 // insufficient — don't fake a mid score
  }

  const onsetMean = mean(onsetStrengths)
  const onsetPeaks = onsetStrengths.filter((o) => o > onsetMean * 2.2 + 0.004)
  const onsetsPerSec = onsetPeaks.length / Math.max(durationSec, 0.01)
  const onsetCv = coeffVar(onsetStrengths.filter((o) => o > 1e-5))
  // Sparse + ultra-uniform onsets → synthetic; busy irregular → natural
  const transientScore = clamp(
    0.45 * clamp(1 - (onsetsPerSec - 0.4) / 7, 0, 1) +
      0.55 * scoreLowCv(onsetCv || 0, 0.35, 2.0),
    0,
    1,
  )

  const loudIdx = zcrWindows
    .map((z, i) => ((rmsWindows[i] ?? 0) > silenceThresh ? z : -1))
    .filter((z) => z >= 0)
  const zcrCv = coeffVar(loudIdx)
  const zcrScore = scoreLowCv(zcrCv || 0, 0.12, 0.85)

  // HF energy variance — room noise / tape hiss / cymbals move; AI beds often static HF
  const hfVar = variance(hfRatios)
  const hfMean = mean(hfRatios)
  const airScore = clamp(
    0.6 * scoreLowCv(Math.sqrt(Math.max(hfVar, 0)) / Math.max(hfMean, 0.05), 0.15, 1.2) +
      0.4 * (hfMean < 0.08 ? 0.7 : hfMean > 0.35 ? 0.25 : 0.4),
    0,
    1,
  )

  // Near-perfect L/R correlation → mild synthetic upmix cue; natural stereo often 0.3–0.85
  const stereoScore =
    buffer.numberOfChannels < 2
      ? 0.35
      : clamp((Math.abs(stereoCorr) - 0.55) / 0.4, 0, 1)

  const features: DetectionFeature[] = [
    {
      id: 'envelope',
      label: 'Amplitude envelope stability',
      score: envelopeScore,
      weight: 1.35,
      detail: `RMS CV ${envCv.toFixed(3)} across active windows (lower = steadier).`,
    },
    {
      id: 'dynamics',
      label: 'Limited macro dynamics',
      score: dynamicsScore,
      weight: 1.25,
      detail: `~${dynRangeDb.toFixed(1)} dB between 10th–90th percentile RMS.`,
    },
    {
      id: 'crest',
      label: 'Crest / peak headroom',
      score: crestScore,
      weight: 0.95,
      detail: `Crest factor ${crestDb.toFixed(1)} dB (peak vs RMS).`,
    },
    {
      id: 'silence',
      label: 'Silence / gap patterning',
      score: silenceScore,
      weight: 0.85,
      detail: gapLens.length
        ? `${gapLens.length} quiet gaps; length CV ${coeffVar(gapLens).toFixed(2)}.`
        : 'No distinct rests — continuous bed.',
    },
    {
      id: 'flatness',
      label: 'Spectral texture motion',
      score: flatnessScore,
      weight: 1.0,
      detail: `Flatness mean ${flatMean.toFixed(3)}, CV ${flatCv.toFixed(3)}.`,
    },
    {
      id: 'pitch',
      label: 'Pitch / period lock',
      score: pitchScore,
      weight: 1.05,
      detail: periods.length
        ? `${periods.length} pitched frames scored for frequency stability.`
        : 'Few clear pitched frames — pitch cue down-weighted.',
    },
    {
      id: 'transients',
      label: 'Transient sparsity / uniformity',
      score: transientScore,
      weight: 1.15,
      detail: `~${onsetsPerSec.toFixed(2)} strong onsets/sec; onset CV ${onsetCv.toFixed(2)}.`,
    },
    {
      id: 'air',
      label: 'High-frequency air motion',
      score: airScore,
      weight: 0.9,
      detail: `HF/mid energy mean ${hfMean.toFixed(3)}, variance ${hfVar.toFixed(4)}.`,
    },
    {
      id: 'zcr',
      label: 'Zero-crossing regularity',
      score: zcrScore,
      weight: 0.65,
      detail: `ZCR CV ${zcrCv.toFixed(3)} on active frames.`,
    },
    {
      id: 'stereo',
      label: 'Stereo image correlation',
      score: stereoScore,
      weight: buffer.numberOfChannels >= 2 ? 0.7 : 0.2,
      detail:
        buffer.numberOfChannels >= 2
          ? `L/R correlation ${stereoCorr.toFixed(3)} (1.0 = identical channels).`
          : 'Mono file — stereo cue lightly weighted.',
    },
  ]

  let wSum = 0
  let sSum = 0
  for (const f of features) {
    wSum += f.weight
    sSum += f.score * f.weight
  }
  const raw = wSum > 0 ? sSum / wSum : 0.5
  // Slight contrast curve so mid-pack scores don't all look like "52"
  const contrasted = 0.5 + (raw - 0.5) * 1.15
  const score = Math.round(clamp(contrasted, 0, 1) * 100)

  let label: DetectionResult['label']
  if (score < 35) label = 'Likely natural'
  else if (score < 55) label = 'Mixed signals'
  else if (score < 75) label = 'Likely synthetic'
  else label = 'Strongly synthetic'

  const rationale = buildRationale(score, label, features, {
    dynRangeDb,
    crestDb,
    envCv,
    gapCount: gapLens.length,
    hfVar,
    onsetsPerSec,
  })

  return {
    score,
    label,
    features,
    rationale,
    durationSec,
    sampleRate: sr,
    channels: buffer.numberOfChannels,
    caveat: CAVEAT,
  }
}
