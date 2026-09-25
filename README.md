# Spectral Humanizer

**AI music detector & humanizer — local, spectral, honest.**

Dark Spektor / THE ALKHEMYST toolkit for artists polishing AI-assisted demos (Suno, Udio, and friends). Upload a track, see a **heuristic AI-likelihood score with a plain-English rationale**, then **humanize** with a **minimal dry-first** offline processing chain — entirely in the browser.

> **Honest note:** Detection is educational / heuristic, **not** forensic and **not** a neural model. Humanize does **not** claim “undetectable” audio or guarantee beating commercial detectors. Browser offline DSP will not compete with Pro Tools / analog gear — trust your ears and disclose AI assistance when required.

- **Live:** [https://marcanex.github.io/spectral-humanizer/](https://marcanex.github.io/spectral-humanizer/)
- **Source:** [github.com/marcanex/spectral-humanizer](https://github.com/marcanex/spectral-humanizer)

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Web Audio API (client-only Float32 processing + AudioBuffer I/O)
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
4. **Humanize engine** — micro-timing, light dynamics, mild warmth, optional width / flutter / tiny room, **Dry/Wet mix** (defaults stay dry)
5. **Presets** — Subtle / Natural / Lived-in / Spektor Stage (distinct, all listenable)
6. **A/B compare** — original vs humanized playback + Bypass (0% mix)
7. **Export WAV** — 16-bit PCM or 32-bit float (matches what you hear)
8. **History** — session metadata in localStorage
9. **Keyboard shortcuts**, settings, honesty / limits modal

## Detection heuristics (educational)

Windowed analysis of amplitude envelope stability, macro dynamics / crest, silence-gap patterning, spectral texture motion, pitch-period lock, transient sparsity, high-frequency air motion, zero-crossing regularity, and stereo correlation. Combined into a 0–100 score with an explicit caveat and a short rationale explaining *why*.

## Humanize effects (v2.2 — clean chain)

Quality over “featureful”. Anything that risks mud / warble / phase / smear is off by default or removed:

- **Micro-timing** — smooth sample-delay wander (≤ ~3 ms peak), hermite interpolate — *no* rate-resample pitch, *no* grain clouds
- **Dynamics ride** — very light upward gain + soft breathe
- **Warmth** — barely-above-unity soft clip + mild HF darkening
- **Width** — proper mid-side only (mono-safe) — **no Haas**
- **Flutter** — optional short modulated delay; **OFF** in Subtle/Natural/Lived-in
- **Space** — optional single early reflection ≤5% wet — **no convolver**
- **Air / noise** — **removed** from the engine (slider disabled)
- **Dry/Wet mix** — master intensity; **0% = true bypass** (equals original)

## Presets

| Preset | Character |
|--------|-----------|
| **Subtle** | Almost dry — tiny timing, mix ~15% |
| **Natural** | Light timing + soft dynamics, mix ~25% |
| **Lived-in** | More timing + mild warmth + whisper of room, mix ~35% |
| **Spektor Stage** | Darker tilt, slight width, mild grit, mix ~40% max |

## Privacy

Audio never leaves your device. No backend.

## License

MIT
