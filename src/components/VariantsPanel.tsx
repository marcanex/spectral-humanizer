export function VariantsPanel({
  variants,
  selected,
  onSelect,
}: {
  variants: string[]
  selected: number
  onSelect: (i: number) => void
}) {
  if (variants.length <= 1) return null
  return (
    <div className="panel p-3 space-y-2">
      <h3 className="font-display text-sm tracking-wide text-[var(--color-fog)] px-1">Variants</h3>
      <div className="flex flex-wrap gap-2">
        {variants.map((v, i) => (
          <button
            key={i}
            type="button"
            className={`chip ${selected === i ? 'active' : ''}`}
            onClick={() => onSelect(i)}
            title={v.slice(0, 120)}
          >
            Option {i + 1}
            <span className="text-[var(--color-muted)] font-mono">{v.trim().split(/\s+/).length}w</span>
          </button>
        ))}
      </div>
    </div>
  )
}
