import { useCallback, useRef, useState, type DragEvent } from 'react'

const ACCEPT = 'audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg,.aac,.flac'

export function DropZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(false)

  const take = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return
      const files = Array.from(list).filter((f) =>
        /audio\/|\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(f.type || f.name),
      )
      if (files.length) onFiles(files)
    },
    [onFiles],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setActive(false)
    if (disabled) return
    take(e.dataTransfer.files)
  }

  return (
    <div
      className={`dropzone rounded-2xl px-6 py-10 text-center cursor-pointer ${active ? 'active' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        setActive(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setActive(true)
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/30 to-violet-600/40 border border-violet-400/30">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 18V6l10-2v12"
            stroke="#f97316"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="18" r="2.5" fill="#a855f7" />
          <circle cx="17" cy="16" r="2.5" fill="#f97316" />
        </svg>
      </div>
      <h3 className="font-display text-xl text-violet-50 mb-1">Drop AI music here</h3>
      <p className="text-sm text-violet-300/70 max-w-md mx-auto">
        Suno, Udio, or any mp3 / wav / m4a / ogg. Detect synthetic stiffness, then humanize groove,
        dynamics, and space — all in your browser.
      </p>
      <p className="mt-3 text-xs text-orange-300/80">Click to browse · batch queue supported</p>
    </div>
  )
}
