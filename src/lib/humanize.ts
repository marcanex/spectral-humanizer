import type { HumanizeParams } from '../types'
import { clamp, hashString, mulberry32 } from './audioUtils'

/** Hermite interpolation — cleaner than linear for delay reads */
function hermite(y0: number, y1: number, y2: number, y3: number, t: number): number {
  const c0 = y1
  const c1 = 0.5 * (y2 - y0)
  const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3
  const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2)
  return ((c3 * t + c2) * t + c1) * t + c0
}

function readSample(data: Float32Array, pos: number): number {
  const i1 = Math.floor(pos)
  const frac = pos - i1
  if (i1 < 1 || i1 + 2 >= data.length) {
    if (i1 < 0 || i1 >= data.length) return 0
    const a = data[i1]!
    const b = data[Math.min(i1 + 1, data.length - 1)]!
    return a + (b - a) * frac
  }
  return hermite(data[i1 - 1]!, data[i1]!, data[i1 + 1]!, data[i1 + 2]!, frac)
}

function softClip(x: number, drive: number): number {
  // Barely-above-unity: drive 0→1 → very mild tanh, level-matched at small x
  const d = 1 + drive * 0.45
  // Divide by d so small-signal gain ≈ tanh'(0)=1 remains ~1 (not boosted)
  return Math.tanh(x * d) / d
}

function ensureStereo(source: AudioBuffer): { L: Float32Array; R: Float32Array; sr: number; len: number } {
  const sr = source.sampleRate
  const len = source.length
  const L = new Float32Array(len)
  const R = new Float32Array(len)
  const c0 = source.getChannelData(0)
  L.set(c0)
  if (source.numberOfChannels > 1) {
    R.set(source.getChannelData(1))
  } else {
    R.set(c0)
  }
  return { L, R, sr, len }
}

function makeOutBuffer(L: Float32Array, R: Float32Array, sr: number): AudioBuffer {
  const ctx = new OfflineAudioContext(2, L.length, sr)
  const out = ctx.createBuffer(2, L.length, sr)
  out.getChannelData(0).set(L)
  out.getChannelData(1).set(R)
  return out
}

/**
 * Micro-timing ONLY via a slowly modulated sample delay (≤ few ms peak).
 * Shared L/R modulation (tiny optional decorrelation) — no grain clouds,
 * no rate-resample pitch, no independent L/R chaos that phases.
 */
function applyMicroTiming(
  L: Float32Array,
  R: Float32Array,
  sr: number,
  jitter: number,
  rng: () => number,
): { L: Float32Array; R: Float32Array } {
  if (jitter < 0.01) return { L, R }

  const len = L.length
  const outL = new Float32Array(len)
  const outR = new Float32Array(len)

  // Peak delay ≤ ~2.8 ms at full jitter — groove, not smear
  const maxMs = 0.25 + jitter * 2.55
  const maxSamp = (maxMs / 1000) * sr

  // Two very slow incommensurate sines → organic wander, continuous & smooth
  const f1 = 0.11 + rng() * 0.09
  const f2 = 0.037 + rng() * 0.03
  const p1 = rng() * Math.PI * 2
  const p2 = rng() * Math.PI * 2
  // Tiny L/R decorrelation (≤ 8% of depth) — mono-safe
  const deco = (rng() * 2 - 1) * 0.08

  const twoPiOverSr = (2 * Math.PI) / sr
  for (let i = 0; i < len; i++) {
    const t = i * twoPiOverSr
    const mod = Math.sin(t * f1 + p1) * 0.65 + Math.sin(t * f2 + p2) * 0.35
    const offset = mod * maxSamp
    outL[i] = readSample(L, i + offset)
    outR[i] = readSample(R, i + offset * (1 + deco))
  }
  return { L: outL, R: outR }
}

/**
 * Very light envelope ride + optional transient ease + mild warmth.
 * No brickwall, no loudness war.
 */
function applyDynamicsTone(
  L: Float32Array,
  R: Float32Array,
  sr: number,
  params: HumanizeParams,
  rng: () => number,
): { L: Float32Array; R: Float32Array } {
  const dyn = params.dynamics
  const soft = params.transientSoft
  const drive = params.warmth
  if (dyn < 0.01 && soft < 0.01 && drive < 0.01) return { L, R }

  const len = L.length
  const outL = new Float32Array(len)
  const outR = new Float32Array(len)

  const win = Math.max(64, Math.floor(sr * 0.01))
  const nWin = Math.ceil(len / win)
  const fastEnv = new Float32Array(nWin)
  for (let g = 0; g < nWin; g++) {
    const start = g * win
    const end = Math.min(len, start + win)
    let sum = 0
    for (let i = start; i < end; i++) {
      const m = (L[i]! + R[i]!) * 0.5
      sum += m * m
    }
    fastEnv[g] = Math.sqrt(sum / Math.max(1, end - start))
  }

  const slowEnv = new Float32Array(nWin)
  let s = fastEnv[0] ?? 0
  for (let i = 0; i < nWin; i++) {
    const target = fastEnv[i]!
    const coeff = target > s ? 0.18 : 0.05
    s = s + (target - s) * coeff
    slowEnv[i] = s
  }

  let meanRms = 0
  let active = 0
  for (let i = 0; i < nWin; i++) {
    if (slowEnv[i]! > 0.002) {
      meanRms += slowEnv[i]!
      active++
    }
  }
  meanRms = active ? meanRms / active : 0.1

  // Tiny breathe — ±0.35 dB-ish at full dyn, not tremolo
  const breathHz = 0.05 + rng() * 0.05
  let breathPhase = rng() * Math.PI * 2
  const breathDepth = dyn * 0.04

  // One-pole dark shelf state (Spektor-ish when warmth high)
  let lpL = 0
  let lpR = 0
  const darkAmt = drive * 0.4

  for (let i = 0; i < len; i++) {
    const g = Math.min(nWin - 1, Math.floor(i / win))
    const fast = fastEnv[g]!
    const slow = slowEnv[g]!
    let xL = L[i]!
    let xR = R[i]!

    if (soft > 0.02 && slow > 1e-5) {
      const ratio = fast / slow
      if (ratio > 1.7) {
        const reduce = clamp((ratio - 1.7) / 3.0, 0, 1) * soft * 0.18
        const keep = 1 - reduce
        xL *= keep
        xR *= keep
      }
    }

    if (dyn > 0.02 && slow > 1e-5 && meanRms > 1e-5) {
      const rel = slow / meanRms
      let ride = 1
      if (rel < 0.8) {
        ride = 1 + (0.8 - rel) * dyn * 0.22 // ≤ ~+1.5 dB upward
      } else if (rel > 1.35) {
        ride = 1 - Math.min(0.08, (rel - 1.35) * dyn * 0.05)
      }
      xL *= ride
      xR *= ride
    }

    breathPhase += (2 * Math.PI * breathHz) / sr
    const breath = 1 + Math.sin(breathPhase) * breathDepth
    xL *= breath
    xR *= breath

    if (drive > 0.02) {
      xL = softClip(xL, drive * 0.55)
      xR = softClip(xR, drive * 0.55)
      if (darkAmt > 0.05) {
        const a = 0.18 + darkAmt * 0.28
        lpL = lpL + (xL - lpL) * (1 - a)
        lpR = lpR + (xR - lpR) * (1 - a)
        const blend = darkAmt * 0.28
        xL = xL * (1 - blend) + lpL * blend
        xR = xR * (1 - blend) + lpR * blend
      }
    }

    outL[i] = xL
    outR[i] = xR
  }
  return { L: outL, R: outR }
}

/**
 * Proper mid-side width. Mono-safe: side boost capped, no Haas.
 * Default off / tiny — widen only when asked.
 */
function applyWidth(
  L: Float32Array,
  R: Float32Array,
  width: number,
): { L: Float32Array; R: Float32Array } {
  if (width < 0.02) return { L, R }
  const len = L.length
  const outL = new Float32Array(len)
  const outR = new Float32Array(len)
  // side multiplier 1 → ~1.35 at full; mid gently pulled so loudness stays similar
  const sideMul = 1 + width * 0.35
  const midMul = 1 - width * 0.08
  for (let i = 0; i < len; i++) {
    const mid = ((L[i]! + R[i]!) * 0.5) * midMul
    const side = ((L[i]! - R[i]!) * 0.5) * sideMul
    outL[i] = mid + side
    outR[i] = mid - side
  }
  return { L: outL, R: outR }
}

/**
 * Optional flutter: very short modulated delay blend (chorus-ish).
 * OFF unless flutter param is set; keep wet tiny to avoid phase wash.
 */
function applyFlutter(
  L: Float32Array,
  R: Float32Array,
  sr: number,
  flutter: number,
  rng: () => number,
): { L: Float32Array; R: Float32Array } {
  if (flutter < 0.02) return { L, R }
  const len = L.length
  const outL = new Float32Array(len)
  const outR = new Float32Array(len)

  const baseMs = 6.5
  const depthMs = flutter * 1.2 // ±1.2 ms at full — subtle shimmer
  const baseSamp = (baseMs / 1000) * sr
  const depthSamp = (depthMs / 1000) * sr
  const wet = flutter * 0.1 // max 10% blend
  const dry = 1 - wet * 0.5
  const f = 0.28 + rng() * 0.25
  const phase = rng() * Math.PI * 2
  const twoPiOverSr = (2 * Math.PI) / sr

  for (let i = 0; i < len; i++) {
    const mod = Math.sin(i * twoPiOverSr * f + phase)
    const d = baseSamp + mod * depthSamp
    const delayedL = readSample(L, i - d)
    const delayedR = readSample(R, i - d)
    outL[i] = L[i]! * dry + delayedL * wet
    outR[i] = R[i]! * dry + delayedR * wet
  }
  return { L: outL, R: outR }
}

/**
 * Optional tiny early reflection (not a convolver wash).
 * Single delayed copy, lowpassed, ≤5% wet. Omitted unless space asked.
 */
function applyTinyRoom(
  L: Float32Array,
  R: Float32Array,
  sr: number,
  space: number,
): { L: Float32Array; R: Float32Array } {
  if (space < 0.05) return { L, R }
  const len = L.length
  const outL = new Float32Array(len)
  const outR = new Float32Array(len)

  const delayMs = 14 + space * 8 // 14–22 ms early reflection
  const delaySamp = Math.floor((delayMs / 1000) * sr)
  const wet = Math.min(0.05, space * 0.08) // hard cap 5%
  const dry = 1 - wet * 0.3

  // One-pole LP on reflection (~3 kHz-ish)
  const a = Math.exp((-2 * Math.PI * 2800) / sr)
  let lpL = 0
  let lpR = 0
  // Tiny L/R offset (±0.4 ms) for spaciousness without Haas trash
  const offsetR = Math.floor(0.0004 * sr)

  for (let i = 0; i < len; i++) {
    const iL = i - delaySamp
    const iR = i - delaySamp - offsetR
    const rawL = iL >= 0 ? L[iL]! : 0
    const rawR = iR >= 0 ? R[iR]! : 0
    lpL = a * lpL + (1 - a) * rawL
    lpR = a * lpR + (1 - a) * rawR
    outL[i] = L[i]! * dry + lpL * wet
    outR[i] = R[i]! * dry + lpR * wet
  }
  return { L: outL, R: outR }
}


/** Soft peak protect — only if we actually clip; no loudness crush */
function softPeakProtect(L: Float32Array, R: Float32Array): void {
  let peak = 0
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]!)
    const b = Math.abs(R[i]!)
    if (a > peak) peak = a
    if (b > peak) peak = b
  }
  if (peak > 0.99) {
    const g = 0.99 / peak
    for (let i = 0; i < L.length; i++) {
      L[i]! *= g
      R[i]! *= g
    }
  }
}

/**
 * Minimal clean humanize:
 * micro-timing → light dynamics/warmth → optional width → optional flutter →
 * optional tiny room.
 *
 * Mix scales COLOR effect depths (dynamics/warmth/width/flutter/space).
 * Micro-timing always replaces the buffer when engaged (never blended against
 * the undelayed original — that combs / hollows). mix=0 → exact original.
 *
 * Intentionally omitted:
 *   Haas, pink/air noise, grain clouds, rate-resample pitch, convolver reverb,
 *   brickwall/soft limiter crush, classic delayed dry/wet blend.
 * Noise param is ignored (kept in types for UI compatibility).
 */
export async function humanizeAudio(
  source: AudioBuffer,
  params: HumanizeParams,
  seedKey = 'spectral',
): Promise<AudioBuffer> {
  const mix = clamp(params.mix ?? 0, 0, 1)
  const { L: dryL, R: dryR, sr, len } = ensureStereo(source)

  // True bypass — bit-identical stereo copy of original
  if (mix < 0.001) {
    return makeOutBuffer(dryL, dryR, sr)
  }

  // Micro-timing replaces the signal (time-aligned with itself) — never
  // dry/wet-blended against the undelayed original (that combs / hollows).
  // Color FX depths are intensity-scaled by mix so low mix stays almost dry.
  const p: HumanizeParams = {
    jitter: params.jitter, // full timing character whenever engaged
    flutter: params.flutter * mix,
    dynamics: params.dynamics * mix,
    noise: 0,
    warmth: params.warmth * mix,
    space: params.space * mix,
    transientSoft: params.transientSoft * mix,
    width: params.width * mix,
    mix: 1,
  }

  const rng = mulberry32(hashString(seedKey + JSON.stringify(params) + len))

  let L = dryL
  let R = dryR

  ;({ L, R } = applyMicroTiming(L, R, sr, p.jitter, rng))
  ;({ L, R } = applyDynamicsTone(L, R, sr, p, rng))
  ;({ L, R } = applyWidth(L, R, p.width))
  ;({ L, R } = applyFlutter(L, R, sr, p.flutter, rng))
  ;({ L, R } = applyTinyRoom(L, R, sr, p.space))

  softPeakProtect(L, R)

  // Yield so UI stays responsive on long files
  await Promise.resolve()
  return makeOutBuffer(L, R, sr)
}
