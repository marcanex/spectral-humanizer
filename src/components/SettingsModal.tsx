import type { AppSettings, Strength, Voice } from '../types'
import { STRENGTH_LABELS, VOICE_LABELS } from '../types'
import { Modal } from './Modal'

export function SettingsModal({
  open,
  onClose,
  settings,
  onChange,
}: {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onChange: (s: AppSettings) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5 text-sm">
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Accent</h3>
          <div className="flex flex-wrap gap-1.5">
            {(['purple', 'magenta', 'ember', 'cyan'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={`chip ${settings.accent === a ? 'active' : ''}`}
                onClick={() => onChange({ ...settings, accent: a })}
              >
                {a}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Defaults</h3>
          <label className="flex items-center justify-between gap-3">
            <span>Default strength</span>
            <select
              className="bg-black/40 border border-[var(--color-border)] rounded-lg px-2 py-1"
              value={settings.defaultStrength}
              onChange={(e) =>
                onChange({ ...settings, defaultStrength: e.target.value as Strength })
              }
            >
              {(Object.keys(STRENGTH_LABELS) as Strength[]).map((k) => (
                <option key={k} value={k}>
                  {STRENGTH_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Default voice</span>
            <select
              className="bg-black/40 border border-[var(--color-border)] rounded-lg px-2 py-1"
              value={settings.defaultVoice}
              onChange={(e) => onChange({ ...settings, defaultVoice: e.target.value as Voice })}
            >
              {(Object.keys(VOICE_LABELS) as Voice[]).map((k) => (
                <option key={k} value={k}>
                  {VOICE_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Behavior</h3>
          <Toggle
            label="Auto-humanize on paste"
            checked={settings.autoHumanizeOnPaste}
            onChange={(v) => onChange({ ...settings, autoHumanizeOnPaste: v })}
          />
          <Toggle
            label="Sync scroll (input ↔ output)"
            checked={settings.syncScroll}
            onChange={(v) => onChange({ ...settings, syncScroll: v })}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Optional LLM boost
          </h3>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Paste an OpenAI-compatible API key and base URL. Stored only in your browser&apos;s
            localStorage — never sent to our servers (there are none). If the call fails, the local
            engine takes over.
          </p>
          <Toggle
            label="Enable LLM boost"
            checked={settings.llmEnabled}
            onChange={(v) => onChange({ ...settings, llmEnabled: v })}
          />
          <label className="block space-y-1">
            <span className="text-xs text-[var(--color-muted)]">API key</span>
            <input
              type="password"
              className="w-full bg-black/40 border border-[var(--color-border)] rounded-lg px-3 py-2"
              value={settings.llmApiKey}
              onChange={(e) => onChange({ ...settings, llmApiKey: e.target.value })}
              placeholder="sk-…"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--color-muted)]">Base URL</span>
            <input
              type="url"
              className="w-full bg-black/40 border border-[var(--color-border)] rounded-lg px-3 py-2"
              value={settings.llmBaseUrl}
              onChange={(e) => onChange({ ...settings, llmBaseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[var(--color-muted)]">Model</span>
            <input
              type="text"
              className="w-full bg-black/40 border border-[var(--color-border)] rounded-lg px-3 py-2"
              value={settings.llmModel}
              onChange={(e) => onChange({ ...settings, llmModel: e.target.value })}
              placeholder="gpt-4o-mini"
            />
          </label>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-black/30 p-3 text-xs text-[var(--color-muted)] leading-relaxed">
          <strong className="text-[var(--color-fog)]">Privacy.</strong> All local processing stays
          on your device. History, library, and settings live in localStorage. Optional LLM calls go
          only to the base URL you configure.
        </section>
      </div>
    </Modal>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`w-10 h-6 rounded-full relative transition ${
          checked ? 'bg-purple-600' : 'bg-white/10'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${
            checked ? 'left-5' : 'left-1'
          }`}
        />
      </button>
    </label>
  )
}
