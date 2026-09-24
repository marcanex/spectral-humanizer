import { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { HumanizeOptions } from '../types'
import { humanizeOnce } from '../lib/humanizer'
import { Modal } from './Modal'

export function BatchModal({
  open,
  onClose,
  options,
  onToast,
}: {
  open: boolean
  onClose: () => void
  options: HumanizeOptions
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}) {
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<{ input: string; output: string }[]>([])

  const blocks = raw
    .split(/\n---\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  async function process() {
    if (!blocks.length) {
      onToast('Paste blocks separated by ---', 'error')
      return
    }
    setBusy(true)
    try {
      const out = blocks.map((input, i) => ({
        input,
        output: humanizeOnce(input, options, i + 1),
      }))
      setResults(out)
      onToast(`Processed ${out.length} block${out.length === 1 ? '' : 's'}`, 'success')
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File) {
    const text = await file.text()
    setRaw(text)
    onToast(`Loaded ${file.name}`, 'info')
  }

  async function downloadZip() {
    if (!results.length) return
    const zip = new JSZip()
    results.forEach((r, i) => {
      zip.file(`block-${String(i + 1).padStart(2, '0')}.md`, r.output)
    })
    zip.file('combined.md', results.map((r) => r.output).join('\n\n---\n\n'))
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, 'spectral-batch.zip')
    onToast('Downloaded zip', 'success')
  }

  function downloadCombined() {
    if (!results.length) return
    const blob = new Blob([results.map((r) => r.output).join('\n\n---\n\n')], {
      type: 'text/markdown',
    })
    saveAs(blob, 'spectral-batch.md')
    onToast('Downloaded combined file', 'success')
  }

  return (
    <Modal open={open} onClose={onClose} title="Batch mode" wide>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-[var(--color-muted)]">
          Paste multiple blocks separated by a line with only <code className="text-amber-200">---</code>,
          or upload a .txt / .md file.
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-ghost text-xs cursor-pointer">
            Upload file
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
              }}
            />
          </label>
          <button type="button" className="btn btn-primary text-xs" onClick={() => void process()} disabled={busy}>
            {busy ? 'Working…' : `Process ${blocks.length || 0} block(s)`}
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => void downloadZip()} disabled={!results.length}>
            Download zip
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={downloadCombined} disabled={!results.length}>
            Download combined
          </button>
        </div>
        <textarea
          className="textarea-spectral min-h-[180px]"
          placeholder={'Block one…\n---\nBlock two…'}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        {results.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="rounded-lg border border-[var(--color-border)] p-3 bg-black/30">
                <p className="text-[10px] text-[var(--color-muted)] mb-1">Block {i + 1}</p>
                <p className="text-sm whitespace-pre-wrap">{r.output}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
