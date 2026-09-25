# Spectral Humanizer

**AI music detector & humanizer — local, spectral, honest.**

Dark Spektor / THE ALKHEMYST toolkit for artists polishing AI-assisted demos (Suno, Udio, and friends). Upload a track, see a **heuristic AI-likelihood score with a plain-English rationale**, then **humanize** with conservative offline Web Audio processing — entirely in the browser.

> **Honest note:** Detection is educational / heuristic, **not** forensic and **not** a neural model. Humanize does **not** claim “undetectable” audio or guarantee beating commercial detectors. Always trust your ears and disclose AI assistance when required.

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
3. **Heuristic AI-music score** — content-sensitive feature bars + rationale text
4. **Humanize engine** — micro-timing delays, flutter (modulated delay), dynamics ride, transient soften, warmth, quiet air, short room, mid-side width, **Dry/Wet mix**
5. **Presets** — Subtle / Natural / Lived-in / Spektor Stage (distinct characters, not “more mud”)
6. **A/B compare** — original vs humanized playback
7. **Export WAV** — 16-bit PCM or 32-bit float (matches what you hear)
8. **History** — session metadata in localStorage
9. **Keyboard shortcuts**, settings, honesty / limits modal

## Detection heuristics (educational)

Windowed analysis of amplitude envelope stability, macro dynamics / crest, silence-gap patterning, spectral texture motion, pitch-period lock, transient sparsity, high-frequency air motion, zero-crossing regularity, and stereo correlation. Combined into a 0–100 score with an explicit caveat and a short rationale explaining *why*.

## Humanize effects

Conservative pipeline by design:

- **Micro-timing** — sample-delay groove (ms scale), hermite interpolation — *no* rate-resample pitch warble
- **Flutter** — short modulated delay blend (chorus-ish), optional
- **Dynamics ride** — gentle upward gain on flat beds + soft breathe
- **Warmth** — mild soft-clip + optional HF darkening
- **Air** — very quiet high-passed hiss
- **Space** — short room, low wet level
- **Width** — mid-side + tiny Haas (≤2 ms)
- **Dry/Wet mix** — master intensity so defaults stay clean

## Presets

| Preset | Character |
|--------|-----------|
| **Subtle** | Barely there — light timing + soft dynamics, mix ~45% |
| **Natural** | Groove + gain ride, little dirt, mix ~62% |
| **Lived-in** | More timing, tape warmth, room air, mix ~72% |
| **Spektor Stage** | Darker tilt, wider image, grit + stage bloom, mix ~78% |

## Privacy

Audio never leaves your device. No backend.

## License

MIT
