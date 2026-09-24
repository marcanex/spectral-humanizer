import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import { Header } from './components/Header'
import { DualEditor } from './components/DualEditor'
import { Controls } from './components/Controls'
import { StatsPanel } from './components/StatsPanel'
import { AiTellList } from './components/AiTellList'
import { DiffView } from './components/DiffView'
import { VariantsPanel } from './components/VariantsPanel'
import { SettingsModal } from './components/SettingsModal'
import { ShortcutsModal } from './components/ShortcutsModal'
import { HistoryPanel } from './components/HistoryPanel'
import { LibraryPanel } from './components/LibraryPanel'
import { BatchModal } from './components/BatchModal'
import { Onboarding } from './components/Onboarding'
import { ToastStack } from './components/ToastStack'
import { useToasts } from './hooks/useToasts'
import { humanizeVariants } from './lib/humanizer'
import { scanAiTells } from './lib/aiTells'
import { computeStats } from './lib/stats'
import { llmRewrite } from './lib/llmBoost'
import { SAMPLE_AI_TEXT } from './lib/samples'
import {
  loadHistory,
  loadLibrary,
  loadSettings,
  saveHistory,
  saveLibrary,
  saveSettings,
  uid,
} from './lib/storage'
import type {
  AppSettings,
  HistoryEntry,
  HumanizeOptions,
  LibraryItem,
} from './types'
import { DEFAULT_PRESERVE } from './types'

export default function App() {
  const { toasts, push, dismiss } = useToasts()
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [input, setInput] = useState('')
  const [variants, setVariants] = useState<string[]>([])
  const [selectedVariant, setSelectedVariant] = useState(0)
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [library, setLibrary] = useState<LibraryItem[]>(() => loadLibrary())

  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!settings.onboardingDone)

  const [options, setOptions] = useState<HumanizeOptions>({
    strength: settings.defaultStrength,
    voice: settings.defaultVoice,
    preserve: { ...DEFAULT_PRESERVE },
    hedges: settings.hedgeDefault,
    variantCount: 3,
  })

  const abortRef = useRef<AbortController | null>(null)
  const pasteArmed = useRef(false)

  const output = variants[selectedVariant] ?? ''
  const tells = useMemo(() => scanAiTells(input), [input])
  const statsBefore = useMemo(() => computeStats(input), [input])
  const statsAfter = useMemo(() => (output ? computeStats(output) : null), [output])

  useEffect(() => {
    saveSettings(settings)
    document.documentElement.dataset.accent = settings.accent
  }, [settings])

  useEffect(() => {
    saveHistory(history)
  }, [history])

  useEffect(() => {
    saveLibrary(library)
  }, [library])

  const runHumanize = useCallback(async () => {
    if (!input.trim()) {
      push('Paste some text first', 'error')
      return
    }
    setBusy(true)
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      let results: string[] = []
      const llmReady =
        settings.llmEnabled && settings.llmApiKey.trim().length > 0

      if (llmReady) {
        try {
          const boosted = await llmRewrite(
            input,
            options,
            {
              apiKey: settings.llmApiKey,
              baseUrl: settings.llmBaseUrl,
              model: settings.llmModel,
            },
            ac.signal,
          )
          const locals = humanizeVariants(input, {
            ...options,
            variantCount: Math.max(0, options.variantCount - 1),
          })
          results = [boosted, ...locals].slice(0, options.variantCount)
          push('LLM boost applied (+ local variants)', 'success')
        } catch (err) {
          if ((err as Error).name === 'AbortError') return
          results = humanizeVariants(input, options)
          push(`LLM failed — used local engine. ${(err as Error).message}`, 'info')
        }
      } else {
        // Yield so UI can paint spinner
        await new Promise((r) => setTimeout(r, 40))
        results = humanizeVariants(input, options)
        push('Humanized with local engine', 'success')
      }

      setVariants(results)
      setSelectedVariant(0)

      const entry: HistoryEntry = {
        id: uid(),
        createdAt: Date.now(),
        input,
        output: results[0] ?? '',
        voice: options.voice,
        strength: options.strength,
      }
      setHistory((h) => [entry, ...h].slice(0, 80))
    } finally {
      setBusy(false)
    }
  }, [input, options, settings, push])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'Enter') {
        e.preventDefault()
        void runHumanize()
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        void copyOutput()
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveToLibrary()
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setShowHistory((v) => !v)
      }
      if (meta && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
      }
      if (meta && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runHumanize, output, input])

  async function copyOutput() {
    if (!output) {
      push('Nothing to copy', 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(output)
      push('Copied output', 'success')
    } catch {
      push('Clipboard blocked', 'error')
    }
  }

  function saveToLibrary() {
    if (!output.trim()) {
      push('Humanize something first', 'error')
      return
    }
    const title = output.trim().slice(0, 48).replace(/\s+/g, ' ') + (output.length > 48 ? '…' : '')
    const item: LibraryItem = {
      id: uid(),
      createdAt: Date.now(),
      text: output,
      title,
      pinned: false,
    }
    setLibrary((lib) => [item, ...lib])
    push('Saved to library', 'success')
  }

  function download(ext: 'txt' | 'md') {
    if (!output) {
      push('Nothing to download', 'error')
      return
    }
    const blob = new Blob([output], { type: ext === 'md' ? 'text/markdown' : 'text/plain' })
    saveAs(blob, `spectral-humanized.${ext}`)
    push(`Downloaded .${ext}`, 'success')
  }

  function onInputChange(v: string) {
    setInput(v)
    if (pasteArmed.current && settings.autoHumanizeOnPaste && v.trim()) {
      pasteArmed.current = false
      // defer so state commits
      window.setTimeout(() => void runHumanize(), 50)
    }
  }

  function finishOnboarding(withSample: boolean) {
    setSettings((s) => ({ ...s, onboardingDone: true }))
    setShowOnboarding(false)
    if (withSample) {
      setInput(SAMPLE_AI_TEXT)
      push('Sample loaded — hit Humanize', 'info')
    }
  }

  const llmArmed = settings.llmEnabled && settings.llmApiKey.trim().length > 0

  return (
    <div className="app-bg" data-accent={settings.accent}>
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenBatch={() => setShowBatch(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenLibrary={() => setShowLibrary(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Honest note */}
        <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-3xl">
          Make writing more natural and less robotic. Results vary — always edit. This is not marketed
          as a detector-beating or cheating tool. Processing is local unless you enable optional LLM boost.
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setInput(SAMPLE_AI_TEXT)}>
            Load sample
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => { setInput(''); setVariants([]) }}>
            Clear
          </button>
          <label className="btn btn-ghost text-xs cursor-pointer">
            Import file
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                void f.text().then((t) => {
                  setInput(t)
                  push(`Imported ${f.name}`, 'info')
                })
              }}
            />
          </label>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => void copyOutput()} disabled={!output}>
            Copy output
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => download('txt')} disabled={!output}>
            .txt
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => download('md')} disabled={!output}>
            .md
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={saveToLibrary} disabled={!output}>
            Save snippet
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 space-y-4">
            <DualEditor
              input={input}
              output={output}
              onInputChange={onInputChange}
              syncScroll={settings.syncScroll}
              onPaste={() => {
                pasteArmed.current = true
              }}
              highlightTells={tells}
            />
            <VariantsPanel
              variants={variants}
              selected={selectedVariant}
              onSelect={setSelectedVariant}
            />
            <DiffView before={input} after={output} />
          </div>

          <aside className="xl:col-span-4 space-y-4">
            <Controls
              options={options}
              onChange={setOptions}
              busy={busy}
              onHumanize={() => void runHumanize()}
              llmArmed={llmArmed}
            />
            <StatsPanel before={statsBefore} after={statsAfter} />
            <AiTellList tells={tells} />
          </aside>
        </div>

        <footer className="pt-8 pb-6 text-center text-[11px] text-[var(--color-muted)] space-y-1">
          <p>
            <span className="font-display tracking-wide text-[var(--color-fog)]">Spectral Humanizer</span>
            {' — '}
            Spektor / THE ALKHEMYST aesthetic · client-only
          </p>
          <p>Always revise the output. Meaning over mimicry.</p>
        </footer>
      </main>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={setSettings}
      />
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <HistoryPanel
        open={showHistory}
        onClose={() => setShowHistory(false)}
        entries={history}
        onRestore={(e) => {
          setInput(e.input)
          setVariants([e.output])
          setSelectedVariant(0)
          setOptions((o) => ({ ...o, voice: e.voice, strength: e.strength }))
          setShowHistory(false)
          push('Restored from history', 'info')
        }}
        onDelete={(id) => setHistory((h) => h.filter((x) => x.id !== id))}
        onClear={() => {
          setHistory([])
          push('History cleared', 'info')
        }}
      />
      <LibraryPanel
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        items={library}
        onUse={(item) => {
          setVariants([item.text])
          setSelectedVariant(0)
          setShowLibrary(false)
          push('Loaded from library', 'info')
        }}
        onDelete={(id) => setLibrary((l) => l.filter((x) => x.id !== id))}
        onTogglePin={(id) =>
          setLibrary((l) => l.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)))
        }
      />
      <BatchModal
        open={showBatch}
        onClose={() => setShowBatch(false)}
        options={options}
        onToast={push}
      />
      <Onboarding
        open={showOnboarding}
        onClose={() => finishOnboarding(false)}
        onTrySample={() => finishOnboarding(true)}
      />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
