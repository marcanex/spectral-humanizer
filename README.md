# Spectral Humanizer

**AI music detector & humanizer — local, spectral, honest.**

Dark Spektor / THE ALKHEMYST toolkit for artists polishing AI-assisted demos (Suno, Udio, and friends). Upload a track, see a **heuristic AI-likelihood score**, then **humanize** groove, dynamics, transients, warmth, noise air, stereo width, and space — entirely in the browser.

> **Honest note:** Detection is educational / heuristic, **not** forensic. Humanize does **not** claim “undetectable” audio or guarantee beating commercial detectors. Always trust your ears and disclose AI assistance when required.

- **Live:** [https://marcanex.github.io/spectral-humanizer/](https://marcanex.github.io/spectral-humanizer/)
- **Source:** [github.com/marcanex/spectral-humanizer](https://github.com/marcanex/spectral-humanizer)

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Web Audio API / `OfflineAudioContext` (client-only)
- localStorage for settings + session metadata

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run build
npm run deploy   # build + gh-pages (base: /spectral-humanizer/)
```

## Features

1. **Drag-drop / file picker** — mp3, wav, m4a, ogg (batch queue)
2. **Waveform + frequency bars** — canvas visualizers with playhead seek
3. **AI-music likelihood gauge** — weighted heuristics with feature breakdown
4. **Humanize engine** — micro-timing jitter, pitch drift, dynamics breathe, transient softening, saturation, pink-noise bed, stereo width, convolver space
5. **Presets** — Subtle / Natural / Lived-in / Spektor Stage (+ custom sliders)
6. **A/B compare** — original vs humanized playback
7. **Export WAV** — 16-bit PCM or 32-bit float
8. **History** — session metadata in localStorage
9. **Keyboard shortcuts**, settings, honesty / limits modal

## Detection heuristics (educational)

Windowed analysis of amplitude envelope stability, macro dynamics / crest, silence-gap patterning, spectral flatness quirks, pitch-period lock, transient sparsity/uniformity, and zero-crossing regularity. Combined into a 0–100 score with an explicit caveat.

## Humanize effects

Sample-domain groove resample (grain jitter + slow pitch wander), envelope-aware transient softening, dynamics breathing, soft-clip warmth, then an `OfflineAudioContext` graph for pink-noise air, Haas/M-S width, and impulse reverb — with gentle peak limiting.

## Privacy

Audio never leaves your device. No backend.

## License

MIT
