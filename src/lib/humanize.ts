import type { HumanizeParams } from '../types'
import { clamp, dbToGain, hashString, mulberry32 } from './audioUtils'

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
  const t = pos - i1
  if (i1 < 1 || i1 + 2 >= data.length) {
    if (i1 < 0 || i1 >= data.length) return 0
    const a = data[i1]!
    const b = data[Math.min(i1 + 1, data.length - 1)]!
    return a + (b - a) * t
  }
  return hermite(data[i1 - 1]!, data[i1]!, data[i1 + 1]!, data[i1 + 2]!, t)
}

function softClip(x: number, drive: number): number {
  // Conservative: drive 0→1 maps to mild tanh, makeup-normalized
  const d = 1 + drive * 1.8
  return Math.tanh(x * d) / Math.tanh(d)
}

function generateImpulse(
  sampleRate: number,
  seconds: number,
  decay: number,
  dark: number,
  rng: () => number,
): AudioBuffer {
  const len = Math.max(1, Math.floor(sampleRate * seconds))
  const ctx = new OfflineAudioContext(2, len, sampleRate)
  const buf = ctx.createBuffer(2, len, sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate
      const env = Math.exp(-t * decay)
      // Sparse early reflections
      const click =
        i < 48 ? (1 - i / 48) * (c === 0 ? 0.9 : 0.65) * (1 - dark * 0.3) : 0
      let n = (rng() * 2 - 1) * 0.28
      // Darken tail for Spektor-ish warmth
      lp = lp + (n - lp) * (0.35 - dark * 0.2)
      n = n * (1 - dark) + lp * dark
      data[i] = (click + n) * env
    }
  }
  return buf
}

function makeAirNoise(length: number, rng: () => number): Float32Array {
  // Pink-ish then we'll high-pass in the graph; keep amplitude modest
  const out = new Float32Array(length)
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0
  for (let i = 0; i < length; i++) {
    const white = rng() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09
    b6 = white * 0.115926
  }
  return out
}

/**
 * Micro-timing only: slowly changing read offsets (ms scale).
 * No variable playback rate — avoids robotic warble.
 */
function applyMicroTiming(
  src: AudioBuffer,
  jitter: number,
  rng: () => number,
): AudioBuffer {
  if (jitter < 0.01) return src

  const sr = src.sampleRate
  const len = src.length
  const chIn = src.numberOfChannels
  const chOut = Math.max(2, chIn)
  const ctx = new OfflineAudioContext(chOut, len, sr)
  const out = ctx.createBuffer(chOut, len, sr)

  const srcCh: Float32Array[] = []
  for (let c = 0; c < chIn; c++) srcCh.push(src.getChannelData(c))
  if (chIn === 1) srcCh.push(src.getChannelData(0))

  // Max offset ~0.4–5.5 ms — audible groove, not smear
  const maxMs = 0.4 + jitter * 5.1
  const maxSamp = (maxMs / 1000) * sr
  const grainSec = 0.055 + (1 - jitter) * 0.04 // shorter grains when more jitter
  const grain = Math.max(128, Math.floor(sr * grainSec))
  const grainCount = Math.ceil(len / grain) + 3

  // Independent L/R offsets for a touch of natural decorrelation
  const offsetsL = new Float32Array(grainCount)
  const offsetsR = new Float32Array(grainCount)
  for (let g = 0; g < grainCount; g++) {
    offsetsL[g] = (rng() * 2 - 1) * maxSamp
    offsetsR[g] = (rng() * 2 - 1) * maxSamp * 0.85
  }

  for (let c = 0; c < chOut; c++) {
    const input = srcCh[Math.min(c, srcCh.length - 1)]!
    const dest = out.getChannelData(c)
    const table = c === 0 ? offsetsL : offsetsR
    for (let i = 0; i < len; i++) {
      const g = Math.floor(i / grain)
      const local = (i - g * grain) / grain
      // Smoothstep crossfade between grain offsets
      const s = local * local * (3 - 2 * local)
      const j0 = table[g] ?? 0
      const j1 = table[g + 1] ?? j0
      const offset = j0 * (1 - s) + j1 * s
      dest[i] = readSample(input, i + offset)
    }
  }
  return out
}

/**
 * Envelope-aware dynamics ride + transient soften + warmth.
 * Preserves headroom; no brickwall crush.
 */
function dynamicsTone(
  src: AudioBuffer,
  params: HumanizeParams,
  rng: () => number,
): AudioBuffer {
  const sr = src.sampleRate
  const len = src.length
  const ch = src.numberOfChannels
  const ctx = new OfflineAudioContext(ch, len, sr)
  const out = ctx.createBuffer(ch, len, sr)

  const win = Math.max(64, Math.floor(sr * 0.008))
  const ref = src.getChannelData(0)
  const nWin = Math.ceil(len / win)
  const fastEnv = new Float32Array(nWin)
  for (let g = 0; g < nWin; g++) {
    const start = g * win
    const end = Math.min(len, start + win)
    let sum = 0
    for (let i = start; i < end; i++) sum += ref[i]! * ref[i]!
    fastEnv[g] = Math.sqrt(sum / Math.max(1, end - start))
  }

  // Slow envelope
  const slowEnv = new Float32Array(nWin)
  let s = fastEnv[0] ?? 0
  for (let i = 0; i < nWin; i++) {
    const target = fastEnv[i]!
    const coeff = target > s ? 0.22 : 0.06
    s = s + (target - s) * coeff
    slowEnv[i] = s
  }

  // Target RMS for gentle upward ride (restore life in flat beds)
  let meanRms = 0
  let active = 0
  for (let i = 0; i < nWin; i++) {
    if (slowEnv[i]! > 0.002) {
      meanRms += slowEnv[i]!
      active++
    }
  }
  meanRms = active ? meanRms / active : 0.1

  const dyn = params.dynamics
  const soft = params.transientSoft
  const drive = params.warmth
  // Spektor-ish dark shelf when warmth is high
  const darkAmt = drive * 0.55

  // Slow breathe LFO — small
  const breathHz = 0.07 + rng() * 0.08
  let breathPhase = rng() * Math.PI * 2
  const breathDepth = dyn * 0.07 // ±0.6 dB-ish at full — musical, not tremolo

  // One-pole lowpass state per channel for warmth darkening
  const lpState = new Float32Array(ch)

  for (let c = 0; c < ch; c++) {
    const input = src.getChannelData(c)
    const dest = out.getChannelData(c)
    breathPhase = rng() * Math.PI * 2
    let lp = 0
    for (let i = 0; i < len; i++) {
      const g = Math.min(nWin - 1, Math.floor(i / win))
      const fast = fastEnv[g]!
      const slow = slowEnv[g]!
      let x = input[i]!

      // Transient soften: only when attack clearly exceeds sustain
      if (soft > 0.02 && slow > 1e-5) {
        const ratio = fast / slow
        if (ratio > 1.55) {
          const reduce = clamp((ratio - 1.55) / 2.8, 0, 1) * soft * 0.28
          x *= 1 - reduce
        }
      }

      // Soft dynamics ride: pull quiet parts toward mean, ease loud peaks
      if (dyn > 0.02 && slow > 1e-5 && meanRms > 1e-5) {
        const rel = slow / meanRms
        let ride = 1
        if (rel < 0.85) {
          // upward: +0..~1.5 dB
          ride = 1 + (0.85 - rel) * dyn * 0.35
        } else if (rel > 1.25) {
          // gentle downward
          ride = 1 - Math.min(0.12, (rel - 1.25) * dyn * 0.08)
        }
        x *= ride
      }

      breathPhase += (2 * Math.PI * breathHz) / sr
      x *= 1 + Math.sin(breathPhase) * breathDepth

      if (drive > 0.02) {
        x = softClip(x, drive * 0.85)
        // Mild HF roll for tape / Spektor darkness
        if (darkAmt > 0.05) {
          const a = 0.12 + darkAmt * 0.35
          lp = lp + (x - lp) * (1 - a)
          x = x * (1 - darkAmt * 0.35) + lp * (darkAmt * 0.35)
        }
      }

      dest[i] = x
    }
    lpState[c] = lp
  }
  return out
}

/**
 * Full pipeline: micro-timing → dynamics/tone → offline (flutter, air, width, space) → dry/wet mix.
 */
export async function humanizeAudio(
  source: AudioBuffer,
  params: HumanizeParams,
  seedKey = 'spectral',
): Promise<AudioBuffer> {
  const mix = clamp(params.mix ?? 1, 0, 1)
  // Early out if fully dry
  if (mix < 0.001) {
    const ctx = new OfflineAudioContext(
      Math.max(2, source.numberOfChannels),
      source.length,
      source.sampleRate,
    )
    const out = ctx.createBuffer(
      Math.max(2, source.numberOfChannels),
      source.length,
      source.sampleRate,
    )
    for (let c = 0; c < out.numberOfChannels; c++) {
      const src = source.getChannelData(Math.min(c, source.numberOfChannels - 1))
      out.copyToChannel(src, c)
    }
    return out
  }

  const rng = mulberry32(hashString(seedKey + JSON.stringify(params) + source.length))

  // 1) Micro-timing (no pitch warble)
  let buf = applyMicroTiming(source, params.jitter, rng)

  // 2) Dynamics / warmth / transient
  buf = dynamicsTone(buf, params, rng)

  // 3) Offline graph: flutter delay, width, air, space
  const sr = buf.sampleRate
  const len = buf.length
  const offline = new OfflineAudioContext(2, len, sr)

  const wetSrc = offline.createBufferSource()
  wetSrc.buffer = buf

  // --- Stereo width (mid-side, mono-safe) ---
  const splitter = offline.createChannelSplitter(2)
  const merger = offline.createChannelMerger(2)
  const width = clamp(params.width, 0, 1)

  // Encode approximate M/S with gains
  const midGain = offline.createGain()
  const sideGain = offline.createGain()
  midGain.gain.value = 1 - width * 0.18
  sideGain.gain.value = 0.55 + width * 0.55

  // Tiny Haas on R only — keep ≤ ~2.2 ms to avoid phase trash
  const haas = offline.createDelay(0.01)
  haas.delayTime.value = 0.0002 + width * 0.002

  wetSrc.connect(splitter)
  // L → mid path to both; R → side with Haas on R
  const leftThru = offline.createGain()
  leftThru.gain.value = 1
  splitter.connect(leftThru, 0)
  leftThru.connect(midGain)
  midGain.connect(merger, 0, 0)
  midGain.connect(merger, 0, 1)

  splitter.connect(sideGain, 1)
  sideGain.connect(merger, 0, 0)
  sideGain.connect(haas)
  haas.connect(merger, 0, 1)

  // --- Flutter: short modulated delay blend (chorus-ish, not pitch resample) ---
  const flutterAmt = clamp(params.flutter, 0, 1)
  const flutterDelay = offline.createDelay(0.03)
  const baseDelay = 0.007
  const flutterDepth = flutterAmt * 0.0035 // ±3.5 ms
  const flutterLfo = offline.createOscillator()
  flutterLfo.type = 'sine'
  flutterLfo.frequency.value = 0.35 + rng() * 0.45
  const flutterLfoGain = offline.createGain()
  flutterLfoGain.gain.value = flutterDepth
  flutterDelay.delayTime.value = baseDelay
  flutterLfo.connect(flutterLfoGain)
  flutterLfoGain.connect(flutterDelay.delayTime)
  const flutterGain = offline.createGain()
  flutterGain.gain.value = flutterAmt * 0.22
  const flutterHp = offline.createBiquadFilter()
  flutterHp.type = 'highpass'
  flutterHp.frequency.value = 180

  // Dry path after width
  const bodyGain = offline.createGain()
  bodyGain.gain.value = 1 - flutterAmt * 0.08

  merger.connect(bodyGain)
  merger.connect(flutterHp)
  flutterHp.connect(flutterDelay)
  flutterDelay.connect(flutterGain)

  const preFx = offline.createGain()
  preFx.gain.value = 1
  bodyGain.connect(preFx)
  flutterGain.connect(preFx)

  // --- Air / noise (very quiet, high-passed) ---
  const noiseBuf = offline.createBuffer(2, len, sr)
  noiseBuf.getChannelData(0).set(makeAirNoise(len, rng))
  noiseBuf.getChannelData(1).set(makeAirNoise(len, rng))
  const noiseSrc = offline.createBufferSource()
  noiseSrc.buffer = noiseBuf
  const noiseHp = offline.createBiquadFilter()
  noiseHp.type = 'highpass'
  noiseHp.frequency.value = 4200
  noiseHp.Q.value = 0.7
  const noiseGain = offline.createGain()
  // Max ~ -50 dB at full — audible as air when soloed, not a bed of hiss
  noiseGain.gain.value =
    params.noise > 0.01 ? dbToGain(-58 + params.noise * 10) : 0

  // --- Space / short room ---
  const space = clamp(params.space, 0, 1)
  const convolver = offline.createConvolver()
  const spaceSec = 0.18 + space * 0.55
  const decay = 3.5 + space * 3.5
  convolver.buffer = generateImpulse(sr, spaceSec, decay, params.warmth * 0.7, rng)
  const reverbGain = offline.createGain()
  reverbGain.gain.value = space * 0.16 // conservative wet
  const dryBody = offline.createGain()
  dryBody.gain.value = 1 - space * 0.08

  const wetBus = offline.createGain()
  wetBus.gain.value = 1

  preFx.connect(dryBody)
  preFx.connect(convolver)
  convolver.connect(reverbGain)
  dryBody.connect(wetBus)
  reverbGain.connect(wetBus)

  noiseSrc.connect(noiseHp)
  noiseHp.connect(noiseGain)
  noiseGain.connect(wetBus)

  // Soft limiter — gentle, not brickwall
  const limiter = offline.createDynamicsCompressor()
  limiter.threshold.value = -2.5
  limiter.knee.value = 10
  limiter.ratio.value = 3.5
  limiter.attack.value = 0.005
  limiter.release.value = 0.18

  wetBus.connect(limiter)
  limiter.connect(offline.destination)

  wetSrc.start(0)
  noiseSrc.start(0)
  if (flutterAmt > 0.01) flutterLfo.start(0)

  const wetRendered = await offline.startRendering()

  // 4) Dry/wet mix against original (channel-matched to stereo)
  const outCtx = new OfflineAudioContext(2, len, sr)
  const mixed = outCtx.createBuffer(2, len, sr)
  for (let c = 0; c < 2; c++) {
    const dryCh = source.getChannelData(Math.min(c, source.numberOfChannels - 1))
    const wetCh = wetRendered.getChannelData(c)
    const dest = mixed.getChannelData(c)
    for (let i = 0; i < len; i++) {
      const d = dryCh[i] ?? 0
      const w = wetCh[i] ?? 0
      dest[i] = d * (1 - mix) + w * mix
    }
  }

  // Peak normalize only if we clip — preserve dynamics otherwise
  let peak = 0
  for (let c = 0; c < 2; c++) {
    const d = mixed.getChannelData(c)
    for (let i = 0; i < len; i++) {
      const a = Math.abs(d[i]!)
      if (a > peak) peak = a
    }
  }
  if (peak > 0.99) {
    const g = 0.99 / peak
    for (let c = 0; c < 2; c++) {
      const d = mixed.getChannelData(c)
      for (let i = 0; i < len; i++) d[i]! *= g
    }
  }

  return mixed
}
