import { toMono } from './audioUtils'

export function drawWaveform(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer | null,
  opts: {
    progress?: number
    color?: string
    glow?: string
    bg?: string
    playhead?: string
  } = {},
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (w < 1 || h < 1) return
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = opts.bg ?? '#0a0610'
  ctx.fillRect(0, 0, w, h)

  // Grid lines
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)'
  ctx.lineWidth = 1
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  if (!buffer) {
    ctx.fillStyle = 'rgba(196, 181, 253, 0.35)'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillText('Drop an AI music track to see its waveform', 16, h / 2)
    return
  }

  const mono = toMono(buffer)
  const step = Math.max(1, Math.floor(mono.length / w))
  const mid = h / 2
  const color = opts.color ?? '#f97316'
  const glow = opts.glow ?? 'rgba(249, 115, 22, 0.45)'

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.shadowColor = glow
  ctx.shadowBlur = 8

  for (let x = 0; x < w; x++) {
    const start = x * step
    let min = 1
    let max = -1
    for (let i = 0; i < step && start + i < mono.length; i++) {
      const v = mono[start + i]!
      if (v < min) min = v
      if (v > max) max = v
    }
    const y1 = mid + min * mid * 0.92
    const y2 = mid + max * mid * 0.92
    ctx.moveTo(x, y1)
    ctx.lineTo(x, y2)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  const progress = opts.progress ?? 0
  if (progress > 0) {
    const px = progress * w
    ctx.strokeStyle = opts.playhead ?? '#e9d5ff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, 0)
    ctx.lineTo(px, h)
    ctx.stroke()
  }
}

export function drawFreqBars(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer | null,
  progress = 0,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (w < 1 || h < 1) return
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  if (!buffer) return

  const mono = toMono(buffer)
  const frameSize = 512
  const pos = Math.min(
    Math.max(0, Math.floor(progress * mono.length) - frameSize / 2),
    Math.max(0, mono.length - frameSize),
  )
  const frame = mono.subarray(pos, pos + frameSize)
  const bars = Math.min(64, Math.floor(w / 6))
  const mags = new Float32Array(bars)

  // Simple band energy via folded abs samples (cheap pseudo-spectrum)
  for (let b = 0; b < bars; b++) {
    const start = Math.floor((b / bars) * frame.length)
    const end = Math.floor(((b + 1) / bars) * frame.length)
    let e = 0
    for (let i = start; i < end; i++) e += Math.abs(frame[i] ?? 0)
    mags[b] = e / Math.max(1, end - start)
  }

  let max = 1e-6
  for (const m of mags) if (m > max) max = m

  const barW = w / bars
  for (let b = 0; b < bars; b++) {
    const n = mags[b]! / max
    const bh = n * h * 0.9
    const x = b * barW
    const grad = ctx.createLinearGradient(0, h - bh, 0, h)
    grad.addColorStop(0, '#f97316')
    grad.addColorStop(0.5, '#a855f7')
    grad.addColorStop(1, '#4c1d95')
    ctx.fillStyle = grad
    ctx.globalAlpha = 0.55 + n * 0.45
    ctx.fillRect(x + 1, h - bh, Math.max(1, barW - 2), bh)
  }
  ctx.globalAlpha = 1
}
