import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { DropZone } from './components/DropZone'
import { ScoreGauge } from './components/ScoreGauge'
import { FeatureList } from './components/FeatureList'
import { HumanizeControls } from './components/HumanizeControls'
import { Modal } from './components/Modal'
import { ToastStack } from './components/ToastStack'
import { useToasts } from './hooks/useToasts'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { analyzeAudioBuffer } from './lib/detect'
import { humanizeAudio } from './lib/humanize'
import { drawFreqBars, drawWaveform } from './lib/drawWaveform'
import { decodeAudioFile, formatBytes, formatDuration, uid } from './lib/audioUtils'
import { downloadWav } from './lib/wav'
import {
  DEFAULT_SETTINGS,
  defaultParams,
  loadHistory,
  loadSettings,
  purgeLegacyKeys,
  pushHistory,
  saveSettings,
} from './lib/storage'
import { matchPreset } from './lib/presets'
import type {
  AppSettings,
  AudioSession,
  DetectionResult,
  HumanizeParams,
  QueueItem,
} from './types'

type CompareMode = 'original' | 'humanized'

export default function App() {
  const { toasts, push, dismiss } = useToasts()
  const player = useAudioPlayer()

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [params, setParams] = useState<HumanizeParams>(() =>
    defaultParams(loadSettings().defaultPreset),
  )
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [original, setOriginal] = useState<AudioBuffer | null>(null)
  const [humanized, setHumanized] = useState<AudioBuffer | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileMeta, setFileMeta] = useState<{ size: number; type: string } | null>(null)
  const [compare, setCompare] = useState<CompareMode>('original')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<AudioSession[]>(() => loadHistory())
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const waveRef = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<HTMLCanvasElement>(null)

  const activeBuffer = compare === 'humanized' && humanized ? humanized : original

  useEffect(() => {
    purgeLegacyKeys()
  }, [])

  useEffect(() => {
    player.load(activeBuffer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBuffer])

  useEffect(() => {
    const canvas = waveRef.current
    if (!canvas) return
    drawWaveform(canvas, activeBuffer, {
      progress: player.duration ? player.currentTime / player.duration : 0,
    })
  }, [activeBuffer, player.currentTime, player.duration, compare])

  useEffect(() => {
    if (!settings.showFreqBars) return
    const canvas = barsRef.current
    if (!canvas) return
    drawFreqBars(
      canvas,
      activeBuffer,
      player.duration ? player.currentTime / player.duration : 0,
    )
  }, [activeBuffer, player.currentTime, player.duration, settings.showFreqBars])

  useEffect(() => {
    document.documentElement.dataset.accent = settings.accent
  }, [settings.accent])

  const persistSettings = useCallback((next: AppSettings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const analyzeBuffer = useCallback(async (buffer: AudioBuffer) => {
    // Yield so UI can paint
    await new Promise((r) => setTimeout(r, 20))
    return analyzeAudioBuffer(buffer)
  }, [])

  const loadFile = useCallback(
    async (file: File, itemId?: string) => {
      setBusy(true)
      try {
        const buffer = await decodeAudioFile(file)
        setOriginal(buffer)
        setHumanized(null)
        setFileName(file.name)
        setFileMeta({ size: file.size, type: file.type || 'audio' })
        setCompare('original')
        setDetection(null)

        let result: DetectionResult | undefined
        if (settings.autoAnalyze) {
          result = await analyzeBuffer(buffer)
          setDetection(result)
          push(`Analyzed “${file.name}” — score ${result.score}`, 'success')
        } else {
          push(`Loaded “${file.name}”`, 'info')
        }

        if (itemId) {
          setQueue((q) =>
            q.map((it) =>
              it.id === itemId
                ? {
                    ...it,
                    status: 'ready',
                    originalBuffer: buffer,
                    detection: result ?? it.detection,
                  }
                : it,
            ),
          )
        }

        setActiveId(itemId ?? null)
      } catch (err) {
        console.error(err)
        push(`Could not decode “${file.name}”. Try wav/mp3/m4a.`, 'error')
        if (itemId) {
          setQueue((q) =>
            q.map((it) =>
              it.id === itemId
                ? { ...it, status: 'error', error: 'Decode failed' }
                : it,
            ),
          )
        }
      } finally {
        setBusy(false)
      }
    },
    [analyzeBuffer, push, settings.autoAnalyze],
  )

  const onFiles = useCallback(
    (files: File[]) => {
      const items: QueueItem[] = files.map((file) => ({
        id: uid('q'),
        file,
        status: 'pending',
      }))
      setQueue((q) => [...q, ...items])
      // Load first immediately
      const first = items[0]
      if (first) void loadFile(first.file, first.id)
      if (items.length > 1) push(`Queued ${items.length} tracks`, 'info')
    },
    [loadFile, push],
  )

  const runAnalyze = useCallback(async () => {
    if (!original) {
      push('Load a track first', 'warn')
      return
    }
    setBusy(true)
    try {
      const result = await analyzeBuffer(original)
      setDetection(result)
      push(`AI-likelihood ${result.score} — ${result.label}`, 'success')
    } finally {
      setBusy(false)
    }
  }, [analyzeBuffer, original, push])

  const runHumanize = useCallback(async () => {
    if (!original) {
      push('Load a track first', 'warn')
      return
    }
    setBusy(true)
    try {
      const out = await humanizeAudio(original, params, fileName || 'track')
      setHumanized(out)
      setCompare('humanized')
      player.load(out)
      push('Humanize complete — A/B with Original vs Humanized', 'success')

      const session: AudioSession = {
        id: uid('sess'),
        name: fileName || 'Untitled',
        createdAt: Date.now(),
        durationSec: original.duration,
        sampleRate: original.sampleRate,
        channels: original.numberOfChannels,
        detectionScore: detection?.score ?? null,
        preset: matchPreset(params),
        params: { ...params },
        sizeBytes: fileMeta?.size ?? 0,
        mimeType: fileMeta?.type ?? 'audio',
      }
      setHistory(pushHistory(session))
    } catch (err) {
      console.error(err)
      push('Humanize failed — try a shorter clip or another format', 'error')
    } finally {
      setBusy(false)
    }
  }, [detection?.score, fileMeta, fileName, original, params, player, push])

  const exportHumanized = useCallback(() => {
    if (!humanized) {
      push('Humanize a track before exporting', 'warn')
      return
    }
    const base = fileName.replace(/\.[^.]+$/, '') || 'spectral'
    downloadWav(humanized, `${base}-humanized.wav`, settings.exportBitDepth)
    push('WAV download started', 'success')
  }, [fileName, humanized, push, settings.exportBitDepth])

  const switchCompare = useCallback(
    (mode: CompareMode) => {
      setCompare(mode)
      const buf = mode === 'humanized' ? humanized : original
      if (buf) {
        const wasPlaying = player.playing
        const t = player.currentTime
        player.load(buf)
        if (wasPlaying) void player.play(t)
        else player.seek(t)
      }
    },
    [humanized, original, player],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowShortcuts(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void runHumanize()
      }
      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        player.toggle()
      }
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        void runAnalyze()
      }
      if (e.key === '1') switchCompare('original')
      if (e.key === '2') switchCompare('humanized')
      if ((e.key === 'e' || e.key === 'E') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        exportHumanized()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exportHumanized, player, runAnalyze, runHumanize, switchCompare])

  const metaLine = useMemo(() => {
    if (!original) return 'No track loaded'
    return `${formatDuration(original.duration)} · ${original.sampleRate} Hz · ${original.numberOfChannels} ch${
      fileMeta ? ` · ${formatBytes(fileMeta.size)}` : ''
    }`
  }, [fileMeta, original])

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenAbout={() => setShowAbout(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {!original && <DropZone onFiles={onFiles} disabled={busy} />}

        {original && (
          <>
            <section className="panel overflow-hidden">
              <div className="panel-header px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-lg text-violet-50 truncate">{fileName}</h2>
                  <p className="text-xs text-violet-300/60">{metaLine}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="btn btn-ghost !text-xs cursor-pointer">
                    Replace
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) onFiles([f])
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost !text-xs"
                    onClick={() => {
                      setOriginal(null)
                      setHumanized(null)
                      setDetection(null)
                      setFileName('')
                      player.stop()
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <canvas
                  ref={waveRef}
                  className="w-full h-36 sm:h-44 rounded-xl border border-violet-500/20 bg-black/40"
                  onClick={(e) => {
                    if (!player.duration) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const ratio = (e.clientX - rect.left) / rect.width
                    player.seek(ratio * player.duration)
                  }}
                />
                {settings.showFreqBars && (
                  <canvas
                    ref={barsRef}
                    className="w-full h-16 rounded-lg border border-violet-500/10 bg-black/30"
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => player.toggle()}>
                    {player.playing ? 'Pause' : 'Play'}
                  </button>
                  <div className="flex rounded-lg overflow-hidden border border-violet-500/30">
                    <button
                      type="button"
                      className={`px-3 py-2 text-xs font-semibold ${compare === 'original' ? 'bg-violet-600 text-white' : 'bg-black/30 text-violet-200'}`}
                      onClick={() => switchCompare('original')}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 text-xs font-semibold ${compare === 'humanized' ? 'bg-orange-600 text-white' : 'bg-black/30 text-violet-200'}`}
                      onClick={() => switchCompare('humanized')}
                      disabled={!humanized}
                    >
                      Humanized
                    </button>
                  </div>
                  <span className="text-xs font-mono text-violet-300/70 tabular-nums ml-auto">
                    {formatDuration(player.currentTime)} / {formatDuration(player.duration)}
                  </span>
                </div>
              </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-6">
              <section className="panel p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg text-violet-50">Detection</h3>
                    <p className="text-[10px] text-violet-300/55 mt-0.5">
                      Heuristic feature analysis · not a neural detector
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost !text-xs"
                    disabled={busy || !original}
                    onClick={() => void runAnalyze()}
                  >
                    {busy ? 'Working…' : 'Analyze'}
                  </button>
                </div>
                <ScoreGauge result={detection} />
                <FeatureList features={detection?.features ?? []} />
                {detection && (
                  <p className="text-[11px] text-violet-300/50 leading-relaxed border-t border-violet-500/15 pt-3">
                    {detection.caveat}
                  </p>
                )}
              </section>

              <section className="panel p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg text-violet-50">Humanize</h3>
                  <span className="text-[10px] uppercase tracking-wider text-orange-300/70">
                    Client-side · OfflineAudioContext
                  </span>
                </div>
                <HumanizeControls params={params} onChange={setParams} disabled={busy} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !original}
                    onClick={() => void runHumanize()}
                  >
                    {busy ? 'Processing…' : 'Humanize track'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!humanized}
                    onClick={exportHumanized}
                  >
                    Export WAV
                  </button>
                </div>
                <p className="text-[11px] text-violet-300/50 leading-relaxed">
                  Creative polish for AI-assisted demos (Suno/Udio-style). Dry-first defaults (mix
                  ≤40%) — prefer clean over wet “human”. Use{' '}
                  <strong className="text-violet-200">Bypass (0% mix)</strong> for a true original.
                  Does <strong className="text-violet-200">not</strong> claim “undetectable” audio.
                  A/B Original vs Humanized; export matches what you hear.
                </p>
              </section>
            </div>
          </>
        )}

        {/* Batch queue */}
        {queue.length > 0 && (
          <section className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base text-violet-50">Batch queue</h3>
              <button
                type="button"
                className="btn btn-ghost !text-xs"
                onClick={() => setQueue([])}
              >
                Clear queue
              </button>
            </div>
            <ul className="space-y-1.5 max-h-48 overflow-auto">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm border ${
                    activeId === item.id
                      ? 'border-orange-500/40 bg-orange-500/10'
                      : 'border-violet-500/15 bg-black/20'
                  }`}
                >
                  <button
                    type="button"
                    className="text-left truncate flex-1 hover:text-orange-200"
                    onClick={() => void loadFile(item.file, item.id)}
                  >
                    {item.file.name}
                  </button>
                  <span className="text-[10px] uppercase tracking-wide text-violet-300/60 shrink-0">
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-wrap gap-2 justify-between items-center text-xs text-violet-300/50 pb-8">
          <button type="button" className="btn btn-ghost !text-xs" onClick={() => setShowHistory(true)}>
            Session history ({history.length})
          </button>
          <p>
            Local-only · no upload · artist toolkit adjacent to{' '}
            <span className="text-violet-200">THE ALKHEMYST</span>
          </p>
        </section>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <Modal open={showSettings} title="Settings" onClose={() => setShowSettings(false)}>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span>Auto-analyze on load</span>
            <input
              type="checkbox"
              checked={settings.autoAnalyze}
              onChange={(e) => persistSettings({ ...settings, autoAnalyze: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Frequency bars</span>
            <input
              type="checkbox"
              checked={settings.showFreqBars}
              onChange={(e) => persistSettings({ ...settings, showFreqBars: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Export bit depth</span>
            <select
              className="bg-black/40 border border-violet-500/30 rounded-md px-2 py-1"
              value={settings.exportBitDepth}
              onChange={(e) =>
                persistSettings({
                  ...settings,
                  exportBitDepth: Number(e.target.value) as 16 | 32,
                })
              }
            >
              <option value={16}>16-bit PCM</option>
              <option value={32}>32-bit float</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Default preset</span>
            <select
              className="bg-black/40 border border-violet-500/30 rounded-md px-2 py-1"
              value={settings.defaultPreset}
              onChange={(e) => {
                const defaultPreset = e.target.value as AppSettings['defaultPreset']
                persistSettings({ ...settings, defaultPreset })
                if (defaultPreset !== 'custom') setParams(defaultParams(defaultPreset))
              }}
            >
              <option value="subtle">Subtle</option>
              <option value="natural">Natural</option>
              <option value="lived-in">Lived-in</option>
              <option value="spektor-stage">Spektor Stage</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-danger !text-xs"
            onClick={() => {
              persistSettings({ ...DEFAULT_SETTINGS })
              setParams(defaultParams('natural'))
              push('Settings reset', 'info')
            }}
          >
            Reset settings
          </button>
        </div>
      </Modal>

      <Modal open={showShortcuts} title="Keyboard shortcuts" onClose={() => setShowShortcuts(false)}>
        <ul className="space-y-2 font-mono text-xs">
          <li>
            <span className="kbd">Space</span> Play / pause
          </li>
          <li>
            <span className="kbd">⌘/Ctrl</span> + <span className="kbd">Enter</span> Humanize
          </li>
          <li>
            <span className="kbd">A</span> Analyze
          </li>
          <li>
            <span className="kbd">1</span> / <span className="kbd">2</span> Original / Humanized
          </li>
          <li>
            <span className="kbd">⌘/Ctrl</span> + <span className="kbd">E</span> Export WAV
          </li>
          <li>
            <span className="kbd">?</span> This cheat sheet
          </li>
        </ul>
      </Modal>

      <Modal open={showAbout} title="Honesty & limits" onClose={() => setShowAbout(false)}>
        <div className="space-y-3 text-sm">
          <p>
            <strong className="text-violet-100">Spectral Humanizer</strong> is a creative audio
            toolkit for artists working with AI-assisted music. Detection measures real signal
            features (dynamics, envelope stability, rests, spectral motion, pitch lock, stereo
            correlation) and explains the score in plain English — it is{' '}
            <em>not</em> a neural network or forensic detector.
          </p>
          <p>
            Humanize uses a minimal dry-first chain: micro-timing sample delays, light dynamics,
            mild warmth, optional mid-side width / flutter / tiny early reflection — with Dry/Wet
            mix defaults kept low (≤40%). No Haas, no noise bed, no convolver wash. It will not
            make audio “undetectable” and is not designed to defeat platform safety systems.
            Browser DSP will not match a Pro Tools session — always A/B with your ears.
          </p>
          <p>
            All processing stays in your browser via the Web Audio API / OfflineAudioContext. No
            audio is uploaded to a server.
          </p>
          <p className="text-violet-300/70 text-xs">
            Aesthetic lineage: Spektor / THE ALKHEMYST — dark spectral ember &amp; violet stage light.
          </p>
        </div>
      </Modal>

      <Modal open={showHistory} title="Session history" onClose={() => setShowHistory(false)}>
        {history.length === 0 ? (
          <p className="text-violet-300/60">No sessions yet — humanize a track to log metadata.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-violet-500/15 bg-black/25 px-3 py-2 text-xs"
              >
                <div className="font-medium text-violet-100 truncate">{s.name}</div>
                <div className="text-violet-300/55 mt-0.5">
                  {new Date(s.createdAt).toLocaleString()} · {formatDuration(s.durationSec)} ·
                  preset {s.preset}
                  {s.detectionScore != null ? ` · score ${s.detectionScore}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 && (
          <button
            type="button"
            className="btn btn-danger !text-xs mt-4"
            onClick={() => {
              setHistory([])
              localStorage.removeItem('spectral-humanizer:history:v2')
            }}
          >
            Clear history
          </button>
        )}
      </Modal>
    </div>
  )
}
