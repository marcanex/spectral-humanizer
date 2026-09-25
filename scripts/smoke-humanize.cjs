/**
 * Synthetic dry-vs-wet peak/RMS check for the clean humanize chain.
 */
const { execSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const root = path.join(__dirname, '..')
const outDir = path.join(__dirname, '_smoke_out')

class FakeAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels
    this.length = length
    this.sampleRate = sampleRate
    this.duration = length / sampleRate
    this._ch = Array.from({ length: channels }, () => new Float32Array(length))
  }
  getChannelData(c) {
    return this._ch[c]
  }
  copyToChannel(src, c) {
    this._ch[c].set(src)
  }
}

class FakeOfflineAudioContext {
  constructor(channels, length, sampleRate) {
    this.channels = channels
    this.length = length
    this.sampleRate = sampleRate
  }
  createBuffer(channels, length, sampleRate) {
    return new FakeAudioBuffer(channels, length, sampleRate)
  }
}

global.OfflineAudioContext = FakeOfflineAudioContext
global.AudioBuffer = FakeAudioBuffer

function peakRms(buf) {
  let peak = 0
  let sum = 0
  const n = buf.length * buf.numberOfChannels
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i])
      if (a > peak) peak = a
      sum += d[i] * d[i]
    }
  }
  return { peak, rms: Math.sqrt(sum / n) }
}

function makeSynthetic(sr = 44100, sec = 1.0) {
  const len = Math.floor(sr * sec)
  const buf = new FakeAudioBuffer(2, len, sr)
  const L = buf.getChannelData(0)
  const R = buf.getChannelData(1)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    let x = 0.25 * Math.sin(2 * Math.PI * 440 * t)
    if (t >= 0.2 && t < 0.22) x += (Math.random() * 2 - 1) * 0.5
    const env = Math.min(1, t * 10) * Math.min(1, (sec - t) * 10)
    L[i] = x * env
    R[i] = x * env * 0.92
  }
  return buf
}

const PRESETS = {
  subtle: {
    jitter: 0.28, flutter: 0, dynamics: 0.12, noise: 0, warmth: 0.05,
    space: 0, transientSoft: 0.05, width: 0, mix: 0.15,
  },
  natural: {
    jitter: 0.4, flutter: 0, dynamics: 0.32, noise: 0, warmth: 0.12,
    space: 0, transientSoft: 0.1, width: 0.08, mix: 0.25,
  },
  'lived-in': {
    jitter: 0.55, flutter: 0, dynamics: 0.28, noise: 0, warmth: 0.32,
    space: 0.18, transientSoft: 0.16, width: 0.12, mix: 0.35,
  },
  'spektor-stage': {
    jitter: 0.36, flutter: 0.18, dynamics: 0.38, noise: 0, warmth: 0.48,
    space: 0.22, transientSoft: 0.12, width: 0.28, mix: 0.4,
  },
}

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true })
  execSync(
    `${path.join(root, 'node_modules/typescript/bin/tsc')} -p ${path.join(__dirname, 'tsconfig.smoke.json')}`,
    { cwd: root, stdio: 'inherit' },
  )

  fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))
  const { humanizeAudio } = require(path.join(outDir, 'lib/humanize.js'))

  const dry = makeSynthetic()
  const dryStats = peakRms(dry)
  console.log('DRY  peak=', dryStats.peak.toFixed(4), 'rms=', dryStats.rms.toFixed(4))

  const bypass = await humanizeAudio(dry, { ...PRESETS.natural, mix: 0 }, 'test')
  let maxDiff = 0
  for (let i = 0; i < dry.length; i++) {
    maxDiff = Math.max(
      maxDiff,
      Math.abs(dry.getChannelData(0)[i] - bypass.getChannelData(0)[i]),
      Math.abs(dry.getChannelData(1)[i] - bypass.getChannelData(1)[i]),
    )
  }
  console.log('BYPASS max|diff|=', maxDiff.toExponential(2))
  if (maxDiff > 1e-7) throw new Error('mix=0 must equal original')

  for (const [name, params] of Object.entries(PRESETS)) {
    const wet = await humanizeAudio(dry, params, 'test-' + name)
    const s = peakRms(wet)
    const peakRatio = s.peak / Math.max(1e-9, dryStats.peak)
    const rmsRatio = s.rms / Math.max(1e-9, dryStats.rms)
    console.log(
      `${name.padEnd(14)} peak=${s.peak.toFixed(4)} (${peakRatio.toFixed(2)}x)  rms=${s.rms.toFixed(4)} (${rmsRatio.toFixed(2)}x)`,
    )
    if (peakRatio > 1.35) throw new Error(`${name}: wet peak too loud (${peakRatio.toFixed(2)}x)`)
    if (rmsRatio > 1.4) throw new Error(`${name}: wet RMS too loud (${rmsRatio.toFixed(2)}x)`)
    if (s.peak > 1.0) throw new Error(`${name}: clipped above 1.0`)
  }

  console.log('OK — dry/wet levels sane; bypass bit-identical')
  fs.rmSync(outDir, { recursive: true, force: true })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
