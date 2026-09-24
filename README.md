# Spectral Humanizer

**Strip the machine voice. Keep the meaning.**

A dark, spectral / gothic-modern text humanizer in the Spektor / THE ALKHEMYST aesthetic. Rewrites stiff or AI-sounding writing into natural human prose — **locally in your browser**, with an optional OpenAI-compatible LLM boost.

> **Honest note:** Quality varies. Always edit the output. This tool is framed as making writing more natural / less robotic — not as a detector-beating or cheating utility.

- **Live:** [https://marcanex.github.io/spectral-humanizer/](https://marcanex.github.io/spectral-humanizer/)
- **Source:** [github.com/marcanex/spectral-humanizer](https://github.com/marcanex/spectral-humanizer)

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Client-only (no backend)
- localStorage for settings, history, library
- Optional `fetch` to your OpenAI-compatible endpoint (key stays in localStorage)

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run build    # → dist/
npm run preview
npm run deploy   # build + gh-pages
```

## Features

1. **Dual editor** — input / output side-by-side (stacks on mobile), optional sync scroll
2. **Local humanize engine** — multi-pass pipeline (AI-tell replacement, rhythm variation, contractions, hedges, synonyms, paragraph reshape, voice presets)
3. **Strength** — Subtle / Balanced / Aggressive
4. **Voices** — Casual, Professional, Academic, Creative/Literary, Street/Confessional (Spektor-flavored)
5. **Preserve** — quotes, markdown, URLs, code fences
6. **Variants** — 1–3 alternatives to pick from
7. **AI-tell scanner** — lists common robotic phrases with counts
8. **Diff view** — word-level before/after
9. **Stats** — words, chars, sentences, avg length, Flesch-ish readability, robotic score
10. **History** — restore / delete / search (localStorage)
11. **Library** — save & pin favorite snippets
12. **Batch mode** — `---` separators or .txt/.md upload; zip or combined download
13. **Import / export** — file drop, copy, .txt/.md download
14. **Keyboard shortcuts** — cheat sheet in-app (⌘/Ctrl+Enter to humanize, etc.)
15. **Settings** — accent themes, defaults, auto-humanize on paste, privacy note
16. **Optional LLM boost** — OpenAI-compatible key + base URL; graceful local fallback
17. **Onboarding** — first-run tour + sample AI fluff
18. **Polish** — responsive, a11y focus, reduced-motion, favicon, OG/meta, toasts

## How the local engine works

Text is split around protected regions (quotes, markdown links, URLs, code fences). Remaining prose runs through ordered passes: strip/replace common AI-tell phrases, context-light synonym swaps, contraction injection scaled by voice, hedge add/remove, sentence merge/split for rhythm, light paragraph reshape, then voice-specific polish. A seeded PRNG (from input + salt) produces stable-but-varied outputs so you can generate 2–3 alternatives without calling a server.

## Privacy

- Default path never leaves your device.
- Optional LLM calls go only to the base URL you set; the API key is stored in `localStorage` only.

## Deploy (GitHub Pages)

Configured with `base: '/spectral-humanizer/'`. Publish the `dist/` folder to the `gh-pages` branch:

```bash
npm run deploy
```

Then enable Pages: **Settings → Pages → Deploy from branch → `gh-pages` / root**.

## License

MIT
