import type { HumanizeParams } from '../types'
import { clamp, dbToGain, hashString, mulberry32 } from './audioUtils'

function softClip(x: number, drive: number): number {
  // Gentle tanh saturation
  const d = 1 + drive * 4
  return Math.tanh(x * d) / Math.tanh(d)
}

function generateImpulse(sampleRate: number, seconds: number, decay: number, stereo: boolean): AudioBuffer {
  const len = Math.max(1, Math.floor(sampleRate * seconds))
  const ch = stereo ? 2 : 1
  const ctx = new OfflineAudioContext(ch, len, sampleRate)
  const buf = ctx.createBuffer(ch, len, sampleRate)
  for (let c = 0; c < ch; c++) {
    const data = buf.getChannelData(c)
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate
      const env = Math.exp(-t * decay)
      // Sparse early reflections + noise tail
      const click = i < 32 ? (1 - i / 32) * (c === 0 ? 1 : 0.7) : 0
      data[i] = (click + (Math.random() * 2 - 1) * 0.35) * env
    }
  }
  return buf
}

function makePinkNoise(length: number, rng: () => number): Float32Array {
  const out = new Float32Array(length)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < length; i++) {
    const white = rng() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return out
}

/**
 * Sample-domain groove pass: micro-timing jitter via grain read offsets +
 * subtle pitch drift via time-varying read speed.
 */
function grooveResample(
  src: AudioBuffer,
  params: HumanizeParams,
  rng: () => number,
): AudioBuffer {
  const channels = src.numberOfChannels
  const sr = src.sampleRate
  const len = src.length
  const outCtx = new OfflineAudioContext(Math.max(2, channels), len, sr)
  const out = outCtx.createBuffer(Math.max(2, channels), len, sr)

  // Ensure at least stereo out for width processing later
  const srcCh: Float32Array[] = []
  for (let c = 0; c < channels; c++) srcCh.push(src.getChannelData(c))
  if (channels === 1) srcCh.push(src.getChannelData(0))

  const jitterAmt = params.jitter * 0.0045 // up to ~4.5ms
  const driftAmt = params.pitchDrift * 0.012 // ±1.2% rate
  const grainSec = 0.08
  const grain = Math.max(64, Math.floor(sr * grainSec))

  // Precompute slow LFO for pitch drift
  const driftLfo = new Float32Array(len)
  let phase = rng() * Math.PI * 2
  const driftHz = 0.15 + rng() * 0.35
  for (let i = 0; i < len; i++) {
    phase += (2 * Math.PI * driftHz) / sr
    // Secondary slower wander
    const wander = Math.sin(phase * 0.37 + 1.7) * 0.4
    driftLfo[i] = Math.sin(phase) * 0.6 + wander
  }

  // Grain start jitter table
  const grainCount = Math.ceil(len / grain) + 2
  const grainOffset = new Float32Array(grainCount)
  for (let g = 0; g < grainCount; g++) {
    grainOffset[g] = (rng() * 2 - 1) * jitterAmt * sr
  }

  for (let c = 0; c < out.numberOfChannels; c++) {
    const input = srcCh[Math.min(c, srcCh.length - 1)]!
    const dest = out.getChannelData(c)
    let readPos = 0
    for (let i = 0; i < len; i++) {
      const g = Math.floor(i / grain)
      const local = i - g * grain
      // Crossfade between grain offsets
      const j0 = grainOffset[g] ?? 0
      const j1 = grainOffset[g + 1] ?? j0
      const jt = local / grain
      const jitter = j0 * (1 - jt) + j1 * jt

      const rate = 1 + driftLfo[i]! * driftAmt
      readPos += rate
      const srcPos = readPos + jitter
      const i0 = Math.floor(srcPos)
      const frac = srcPos - i0
      if (i0 < 0 || i0 + 1 >= input.length) {
        dest[i] = 0
      } else {
        dest[i] = input[i0]! * (1 - frac) + input[i0 + 1]! * frac
      }
    }
  }
  return out
}

/**
 * Apply dynamics breathing, transient softening, and soft saturation in-place-ish (new buffer).
 */
function dynamicsAndTone(
  src: AudioBuffer,
  params: HumanizeParams,
  rng: () => number,
): AudioBuffer {
  const sr = src.sampleRate
  const len = src.length
  const ch = src.numberOfChannels
  const ctx = new OfflineAudioContext(ch, len, sr)
  const out = ctx.createBuffer(ch, len, sr)

  const win = Math.max(32, Math.floor(sr * 0.01))
  const env = new Float32Array(Math.ceil(len / win))
  // Use ch0 for envelope follower
  const ref = src.getChannelData(0)
  for (let g = 0; g < env.length; g++) {
    const start = g * win
    const end = Math.min(len, start + win)
    let sum = 0
    for (let i = start; i < end; i++) sum += ref[i]! * ref[i]!
    env[g] = Math.sqrt(sum / Math.max(1, end - start))
  }

  // Smooth envelope
  const smooth = new Float32Array(env.length)
  let s = env[0] ?? 0
  for (let i = 0; i < env.length; i++) {
    const target = env[i]!
    const atk = target > s ? 0.35 : 0.08
    s = s + (target - s) * atk
    smooth[i] = s
  }

  // Macro dynamics LFO (breathing)
  const breathHz = 0.08 + rng() * 0.12
  let breathPhase = rng() * Math.PI * 2
  const dynDepth = params.dynamics * 0.18 // ±1.5 dB-ish at full

  // Transient soften: reduce attack peaks relative to slow envelope
  const soft = params.transientSoft

  const drive = params.warmth

  for (let c = 0; c < ch; c++) {
    const input = src.getChannelData(c)
    const dest = out.getChannelData(c)
    breathPhase = rng() * Math.PI * 2
    for (let i = 0; i < len; i++) {
      const g = Math.min(smooth.length - 1, Math.floor(i / win))
      const fast = env[g] ?? 0
      const slow = smooth[g] ?? 0
      let x = input[i]!

      // Soften transients where fast >> slow
      if (soft > 0.01 && slow > 1e-5) {
        const ratio = fast / slow
        if (ratio > 1.4) {
          const reduce = clamp((ratio - 1.4) / 3, 0, 1) * soft * 0.45
          x *= 1 - reduce
        }
      }

      breathPhase += (2 * Math.PI * breathHz) / sr
      const breath = 1 + Math.sin(breathPhase) * dynDepth
      // Extra random micro-gain every ~120ms
      const micro = 1 + (rng() - 0.5) * params.dynamics * 0.04
      x *= breath * micro

      if (drive > 0.01) x = softClip(x, drive)

      dest[i] = x
    }
  }
  return out
}

/**
 * Full humanize pipeline via OfflineAudioContext for noise, reverb, width.
 */
export async function humanizeAudio(
  source: AudioBuffer,
  params: HumanizeParams,
  seedKey = 'spectral',
): Promise<AudioBuffer> {
  const rng = mulberry32(hashString(seedKey + JSON.stringify(params) + source.length))

  // 1) Groove: micro-timing + pitch drift
  let buf = grooveResample(source, params, rng)

  // 2) Dynamics / warmth / transient soft
  buf = dynamicsAndTone(buf, params, rng)

  // 3) Offline graph: noise bed + stereo width + reverb + makeup
  const sr = buf.sampleRate
  const len = buf.length
  const ch = 2
  const offline = new OfflineAudioContext(ch, len, sr)

  const srcNode = offline.createBufferSource()
  srcNode.buffer = buf

  // Mid-side width
  const splitter = offline.createChannelSplitter(2)
  const merger = offline.createChannelMerger(2)
  const midGain = offline.createGain()
  const sideGain = offline.createGain()
  const width = clamp(params.width, 0, 1)
  midGain.gain.value = 1 - width * 0.25
  sideGain.gain.value = 0.5 + width * 0.75

  // Simple M/S via channel gains after splitter — approximate width with Haas delay on R
  const delayR = offline.createDelay(0.03)
  delayR.delayTime.value = 0.0008 + width * 0.012

  const dryGain = offline.createGain()
  dryGain.gain.value = 1

  srcNode.connect(splitter)
  splitter.connect(midGain, 0)
  splitter.connect(sideGain, 1)
  midGain.connect(merger, 0, 0)
  midGain.connect(merger, 0, 1)
  sideGain.connect(merger, 0, 0)
  sideGain.connect(delayR)
  delayR.connect(merger, 0, 1)

  // Noise bed (pink)
  const noiseLen = len
  const noiseBuf = offline.createBuffer(2, noiseLen, sr)
  const pinkL = makePinkNoise(noiseLen, rng)
  const pinkR = makePinkNoise(noiseLen, rng)
  noiseBuf.getChannelData(0).set(pinkL)
  noiseBuf.getChannelData(1).set(pinkR)
  const noiseSrc = offline.createBufferSource()
  noiseSrc.buffer = noiseBuf
  const noiseGain = offline.createGain()
  // Noise: up to about -28 dB at full
  noiseGain.gain.value = params.noise > 0.001 ? dbToGain(-42 + params.noise * 14) : 0
  const noiseFilter = offline.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 1800
  noiseFilter.Q.value = 0.6

  // Reverb / space
  const convolver = offline.createConvolver()
  const spaceSec = 0.35 + params.space * 1.4
  const decay = 2.2 + params.space * 4
  convolver.buffer = generateImpulse(sr, spaceSec, decay, true)
  const reverbGain = offline.createGain()
  reverbGain.gain.value = params.space * 0.38
  const dryOut = offline.createGain()
  dryOut.gain.value = 1 - params.space * 0.22

  const master = offline.createGain()
  master.gain.value = 0.92

  // Soft limiter
  const limiter = offline.createDynamicsCompressor()
  limiter.threshold.value = -3
  limiter.knee.value = 6
  limiter.ratio.value = 8
  limiter.attack.value = 0.003
  limiter.release.value = 0.15

  merger.connect(dryGain)
  dryGain.connect(dryOut)
  dryGain.connect(convolver)
  convolver.connect(reverbGain)

  noiseSrc.connect(noiseFilter)
  noiseFilter.connect(noiseGain)

  dryOut.connect(master)
  reverbGain.connect(master)
  noiseGain.connect(master)
  master.connect(limiter)
  limiter.connect(offline.destination)

  srcNode.start(0)
  noiseSrc.start(0)

  const rendered = await offline.startRendering()

  // Peak normalize gently to -1 dBFS if needed
  let peak = 0
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    const d = rendered.getChannelData(c)
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]!)
      if (a > peak) peak = a
    }
  }
  if (peak > 0.99) {
    const g = 0.99 / peak
    for (let c = 0; c < rendered.numberOfChannels; c++) {
      const d = rendered.getChannelData(c)
      for (let i = 0; i < d.length; i++) d[i]! *= g
    }
  }

  return rendered
}
