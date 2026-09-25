import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const require = createRequire(import.meta.url)
const jiti = require('jiti')(import.meta.url)
const { analyzeAudioBuffer } = jiti(path.join(root, 'src/lib/detect.ts'))

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
}

function fillFlatAI(buf) {
  const sr = buf.sampleRate
  for (let i = 0; i < buf.length; i++) {
    const t = i / sr
    const x =
      Math.sin(2 * Math.PI * 220 * t) * 0.55 +
      Math.sin(2 * Math.PI * 440 * t) * 0.25 +
      Math.sin(2 * Math.PI * 660 * t) * 0.12
    const s = x * 0.35
    buf.getChannelData(0)[i] = s
    buf.getChannelData(1)[i] = s * 0.98
  }
}

function fillLiveLike(buf) {
  const sr = buf.sampleRate
  let phase = 0
  for (let i = 0; i < buf.length; i++) {
    const t = i / sr
    const bar = t % 0.7
    const gap = bar > 0.55 ? 0 : 1
    const env =
      gap * (0.15 + 0.7 * Math.abs(Math.sin(t * 1.7)) * (0.5 + 0.5 * Math.sin(t * 0.23)))
    const freq = 180 + 40 * Math.sin(t * 3.1) + 15 * Math.sin(t * 0.4)
    phase += (2 * Math.PI * freq) / sr
    const noise = (Math.random() * 2 - 1) * 0.04
    const x = Math.sin(phase) * 0.6 + Math.sin(phase * 2.01) * 0.2 + noise
    const s = x * env
    const hit = Math.random() < 0.002 ? Math.random() * 0.5 : 0
    buf.getChannelData(0)[i] = s + hit
    buf.getChannelData(1)[i] = s * 0.7 + (Math.random() * 2 - 1) * 0.03 * env + hit * 0.4
  }
}

const sr = 44100
const len = sr * 4
const flat = new FakeAudioBuffer(2, len, sr)
fillFlatAI(flat)
const live = new FakeAudioBuffer(2, len, sr)
fillLiveLike(live)

const a = analyzeAudioBuffer(flat)
const b = analyzeAudioBuffer(live)

console.log('FLAT_AI', a.score, a.label)
console.log('  features', a.features.map((f) => `${f.id}:${(f.score * 100) | 0}`).join(' '))
console.log('LIVE_LIKE', b.score, b.label)
console.log('  features', b.features.map((f) => `${f.id}:${(f.score * 100) | 0}`).join(' '))

const spread = Math.abs(a.score - b.score)
const avgFeatSpread =
  a.features.reduce((s, f, i) => s + Math.abs(f.score - b.features[i].score), 0) / a.features.length

console.log('SCORE_DELTA', spread)
console.log('AVG_FEATURE_DELTA', avgFeatSpread.toFixed(3))
console.log('RATIONALE_OK', Boolean(a.rationale && b.rationale))

if (spread < 12) {
  console.error('FAIL: scores too similar')
  process.exit(1)
}
if (avgFeatSpread < 0.08) {
  console.error('FAIL: feature bars too similar')
  process.exit(1)
}
if (!a.rationale || !b.rationale) {
  console.error('FAIL: missing rationale')
  process.exit(1)
}
console.log('PASS')
