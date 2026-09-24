import { useCallback, useRef, type ChangeEvent, type DragEvent } from 'react'

export function DualEditor({
  input,
  output,
  onInputChange,
  syncScroll,
  onPaste,
  highlightTells,
}: {
  input: string
  output: string
  onInputChange: (v: string) => void
  syncScroll: boolean
  onPaste?: () => void
  highlightTells?: { phrase: string; indices: number[] }[]
}) {
  const inRef = useRef<HTMLTextAreaElement>(null)
  const outRef = useRef<HTMLTextAreaElement>(null)
  const syncing = useRef(false)

  const sync = useCallback(
    (from: 'in' | 'out') => {
      if (!syncScroll || syncing.current) return
      const a = from === 'in' ? inRef.current : outRef.current
      const b = from === 'in' ? outRef.current : inRef.current
      if (!a || !b) return
      syncing.current = true
      const ratio = a.scrollTop / Math.max(1, a.scrollHeight - a.clientHeight)
      b.scrollTop = ratio * Math.max(0, b.scrollHeight - b.clientHeight)
      requestAnimationFrame(() => {
        syncing.current = false
      })
    },
    [syncScroll],
  )

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!/\.(txt|md)$/i.test(file.name) && !file.type.startsWith('text/')) return
    void file.text().then(onInputChange)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="panel p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="input-editor" className="font-display text-sm tracking-wide text-[var(--color-fog)]">
            Input
          </label>
          <span className="text-[10px] text-[var(--color-muted)]">Drop .txt / .md</span>
        </div>
        <textarea
          id="input-editor"
          ref={inRef}
          className="textarea-spectral flex-1"
          placeholder="Paste stiff or AI-sounding text…"
          value={input}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onInputChange(e.target.value)}
          onScroll={() => sync('in')}
          onPaste={() => onPaste?.()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          spellCheck
        />
        {highlightTells && highlightTells.length > 0 && (
          <p className="text-[10px] text-[var(--color-muted)] px-1">
            Scanner found patterns — see AI-tell panel. Highlights apply conceptually to matches listed there.
          </p>
        )}
      </div>
      <div className="panel p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="output-editor" className="font-display text-sm tracking-wide text-[var(--color-fog)]">
            Output
          </label>
          <span className="text-[10px] text-[var(--color-muted)]">Humanized prose</span>
        </div>
        <textarea
          id="output-editor"
          ref={outRef}
          className="textarea-spectral flex-1"
          placeholder="Humanized text appears here…"
          value={output}
          readOnly
          onScroll={() => sync('out')}
        />
      </div>
    </div>
  )
}
