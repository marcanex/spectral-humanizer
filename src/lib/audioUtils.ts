/** Seeded PRNG (mulberry32) for reproducible humanize passes */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20)
}

export function rmsOf(samples: Float32Array, start = 0, end = samples.length): number {
  let sum = 0
  const n = Math.max(1, end - start)
  for (let i = start; i < end; i++) {
    const x = samples[i]!
    sum += x * x
  }
  return Math.sqrt(sum / n)
}

export function peakOf(samples: Float32Array, start = 0, end = samples.length): number {
  let p = 0
  for (let i = start; i < end; i++) {
    const a = Math.abs(samples[i]!)
    if (a > p) p = a
  }
  return p
}

/** Mix multi-channel AudioBuffer down to mono Float32Array (copy). */
export function toMono(buffer: AudioBuffer): Float32Array {
  const len = buffer.length
  const out = new Float32Array(len)
  const ch = buffer.numberOfChannels
  for (let c = 0; c < ch; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < len; i++) out[i]! += data[i]! / ch
  }
  return out
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  try {
    const ab = await file.arrayBuffer()
    return await ctx.decodeAudioData(ab.slice(0))
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

export function copyBuffer(src: AudioBuffer): AudioBuffer {
  const ctx = new OfflineAudioContext(src.numberOfChannels, src.length, src.sampleRate)
  const dst = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate)
  for (let c = 0; c < src.numberOfChannels; c++) {
    dst.copyToChannel(src.getChannelData(c), c)
  }
  return dst
}
