import type { HumanizeOptions, Strength, Voice } from '../types'
import { AI_TELL_PHRASES } from './aiTells'

interface TokenBlock {
  type: 'protect' | 'text'
  value: string
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function hashSeed(str: string, salt: number): number {
  let h = salt >>> 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b1)
  }
  return h >>> 0
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length) % arr.length]
}

/** Extract protected regions so we don't rewrite them */
function protectRegions(
  text: string,
  opts: HumanizeOptions['preserve'],
): TokenBlock[] {
  const patterns: { re: RegExp; enabled: boolean }[] = [
    { re: /```[\s\S]*?```/g, enabled: opts.codeFences },
    { re: /`[^`\n]+`/g, enabled: opts.codeFences },
    { re: /https?:\/\/[^\s)>\]]+/gi, enabled: opts.urls },
    { re: /\[[^\]]+\]\([^)]+\)/g, enabled: opts.markdown },
    { re: /!\[[^\]]*\]\([^)]+\)/g, enabled: opts.markdown },
    { re: /(?:"[^"\n]{1,400}"|'[^'\n]{1,400}')/g, enabled: opts.quotes },
  ]

  type Span = { start: number; end: number }
  const spans: Span[] = []

  for (const { re, enabled } of patterns) {
    if (!enabled) continue
    const r = new RegExp(re.source, re.flags)
    let m: RegExpExecArray | null
    while ((m = r.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length })
    }
  }

  spans.sort((a, b) => a.start - b.start)
  const merged: Span[] = []
  for (const s of spans) {
    const last = merged[merged.length - 1]
    if (last && s.start <= last.end) {
      last.end = Math.max(last.end, s.end)
    } else {
      merged.push({ ...s })
    }
  }

  const blocks: TokenBlock[] = []
  let cursor = 0
  for (const s of merged) {
    if (cursor < s.start) {
      blocks.push({ type: 'text', value: text.slice(cursor, s.start) })
    }
    blocks.push({ type: 'protect', value: text.slice(s.start, s.end) })
    cursor = s.end
  }
  if (cursor < text.length) {
    blocks.push({ type: 'text', value: text.slice(cursor) })
  }
  return blocks.length ? blocks : [{ type: 'text', value: text }]
}

function replaceAiTells(text: string, strength: Strength, rand: () => number): string {
  const rate = strength === 'subtle' ? 0.7 : strength === 'balanced' ? 0.95 : 1
  const sorted = [...AI_TELL_PHRASES].sort((a, b) => b.phrase.length - a.phrase.length)
  const lower = text.toLowerCase()
  type Hit = { start: number; end: number; replacement: string }
  const hits: Hit[] = []
  const taken: boolean[] = Array(text.length).fill(false)

  for (const entry of sorted) {
    const phrase = entry.phrase.toLowerCase()
    let pos = 0
    while (pos < lower.length) {
      const idx = lower.indexOf(phrase, pos)
      if (idx === -1) break
      const end = idx + phrase.length
      let overlap = false
      for (let i = idx; i < end; i++) {
        if (taken[i]) {
          overlap = true
          break
        }
      }
      if (!overlap && rand() <= rate) {
        const original = text.slice(idx, end)
        const rep = pick(entry.replacements, rand)
        const replacement = rep ? matchCase(original, rep) : ''
        hits.push({ start: idx, end, replacement })
        for (let i = idx; i < end; i++) taken[i] = true
      }
      pos = idx + Math.max(1, phrase.length)
    }
  }

  hits.sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = 0
  for (const h of hits) {
    out += text.slice(cursor, h.start)
    out += h.replacement
    cursor = h.end
  }
  out += text.slice(cursor)

  out = out.replace(/[ \t]{2,}/g, ' ')
  out = out.replace(/ +\./g, '.')
  out = out.replace(/^ +/gm, '')
  out = out.replace(/\bthe\s+(these|this|those)\b/gi, '$1')
  out = out.replace(/\bhelps\s+stronger\b/gi, 'helps drive stronger')
  out = out.replace(/\bhelps\s+better\b/gi, 'helps create better')
  return out
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchCase(original: string, replacement: string): string {
  if (!replacement) return ''
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase()
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }
  return replacement
}

const CONTRACTIONS: [RegExp, string][] = [
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\bwill not\b/gi, "won't"],
  [/\bcannot\b/gi, "can't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bhave not\b/gi, "haven't"],
  [/\bhas not\b/gi, "hasn't"],
  [/\bhad not\b/gi, "hadn't"],
  [/\bit is\b/gi, "it's"],
  [/\bthat is\b/gi, "that's"],
  [/\bthere is\b/gi, "there's"],
  [/\bwe are\b/gi, "we're"],
  [/\bthey are\b/gi, "they're"],
  [/\byou are\b/gi, "you're"],
  [/\bI am\b/g, "I'm"],
  [/\bwe will\b/gi, "we'll"],
  [/\byou will\b/gi, "you'll"],
  [/\bthey will\b/gi, "they'll"],
  [/\bI will\b/g, "I'll"],
  [/\blet us\b/gi, "let's"],
]

function injectContractions(text: string, strength: Strength, voice: Voice, rand: () => number): string {
  if (voice === 'academic' || voice === 'professional') {
    // Light touch only
    if (strength === 'subtle') return text
  }
  const rate =
    voice === 'casual' || voice === 'street'
      ? strength === 'aggressive'
        ? 0.95
        : 0.75
      : strength === 'aggressive'
        ? 0.55
        : 0.35
  let out = text
  for (const [re, rep] of CONTRACTIONS) {
    out = out.replace(re, (m) => (rand() < rate ? matchCase(m, rep) : m))
  }
  return out
}

const SYNONYM_MAP: Record<string, string[]> = {
  significant: ['big', 'notable', 'real', 'substantial'],
  substantially: ['a lot', 'considerably', 'really'],
  numerous: ['many', 'plenty of', 'lots of'],
  approximately: ['about', 'roughly', 'around'],
  subsequently: ['later', 'then', 'after that'],
  previously: ['earlier', 'before', 'already'],
  currently: ['now', 'at the moment', 'these days'],
  demonstrate: ['show', 'prove', 'make clear'],
  demonstrates: ['shows', 'proves', 'makes clear'],
  indicate: ['suggest', 'point to', 'show'],
  indicates: ['suggests', 'points to', 'shows'],
  obtain: ['get', 'gain', 'pick up'],
  require: ['need', 'call for', 'ask for'],
  requires: ['needs', 'calls for'],
  assist: ['help', 'support', 'back'],
  commence: ['start', 'begin', 'kick off'],
  terminate: ['end', 'stop', 'close'],
  endeavor: ['try', 'attempt', 'shot'],
  purchase: ['buy', 'pick up', 'get'],
  individuals: ['people', 'folks', 'persons'],
  individual: ['person', 'someone'],
  regarding: ['about', 'on', 'around'],
  concerning: ['about', 'on'],
  therefore: ['so', 'thus', 'hence'],
  however: ['but', 'still', 'though'],
  thus: ['so', 'that way'],
  hence: ['so', 'that\'s why'],
  sufficient: ['enough', 'adequate'],
}

function synonymSwap(text: string, strength: Strength, rand: () => number): string {
  const rate = strength === 'subtle' ? 0.35 : strength === 'balanced' ? 0.6 : 0.85
  let out = text
  const keys = Object.keys(SYNONYM_MAP).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    const re = new RegExp(`\\b${escapeReg(key)}\\b`, 'gi')
    out = out.replace(re, (m) => {
      if (rand() > rate) return m
      return matchCase(m, pick(SYNONYM_MAP[key], rand))
    })
  }
  return out
}

const HEDGES_ADD = ['kind of', 'sort of', 'a bit', 'maybe', 'I think', 'honestly', 'pretty much']
const HEDGES_STRIP = [
  /\bquite\b/gi,
  /\brather\b/gi,
  /\bsomewhat\b/gi,
  /\brelatively\b/gi,
  /\barguably\b/gi,
  /\bpotentially\b/gi,
]

function hedgeControl(
  text: string,
  mode: HumanizeOptions['hedges'],
  rand: () => number,
): string {
  if (mode === 'same') return text
  if (mode === 'less') {
    let out = text
    for (const re of HEDGES_STRIP) {
      out = out.replace(re, '')
    }
    return out.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.])/g, '$1')
  }
  // more: inject occasional softener at sentence starts
  return text.replace(/(^|[.!?]\s+)([A-Z])/g, (full, lead: string, cap: string) => {
    if (rand() > 0.25) return full
    const h = pick(HEDGES_ADD, rand)
    return `${lead}${h.charAt(0).toUpperCase() + h.slice(1)}, ${cap.toLowerCase()}`
  })
}

function splitSentences(paragraph: string): string[] {
  const parts = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [paragraph]
}

function varyRhythm(text: string, strength: Strength, rand: () => number): string {
  const paras = text.split(/\n{2,}/)
  const rate = strength === 'subtle' ? 0.25 : strength === 'balanced' ? 0.5 : 0.75

  return paras
    .map((para) => {
      const sentences = splitSentences(para.trim())
      if (sentences.length < 2) return para

      const next: string[] = []
      for (let i = 0; i < sentences.length; i++) {
        let s = sentences[i]
        // Occasionally split long sentences at conjunctions
        if (s.split(/\s+/).length > 28 && rand() < rate) {
          const splitAt = s.search(/,\s+(and|but|so|which|while)\s+/i)
          if (splitAt > 10) {
            const a = s.slice(0, splitAt).trim() + '.'
            let b = s.slice(splitAt + 1).replace(/^,\s*/, '').trim()
            b = b.charAt(0).toUpperCase() + b.slice(1)
            next.push(a, b)
            continue
          }
        }
        // Occasionally merge short adjacent sentences
        if (
          i < sentences.length - 1 &&
          s.split(/\s+/).length < 8 &&
          sentences[i + 1].split(/\s+/).length < 10 &&
          rand() < rate * 0.6
        ) {
          const joiner = pick([' — ', '; ', ', and '], rand)
          let merged = s.replace(/[.!?]+$/, '') + joiner + sentences[i + 1].charAt(0).toLowerCase() + sentences[i + 1].slice(1)
          next.push(merged)
          i++
          continue
        }
        // Drop trailing fluff commas / reorder mild
        if (rand() < rate * 0.3 && s.includes(', ')) {
          // leave mostly intact; light rhythm tweak via em-dash
          s = s.replace(/,\s+([^,]{8,40})\.$/, ' — $1.')
        }
        next.push(s)
      }
      return next.join(' ')
    })
    .join('\n\n')
}

function reshapeParagraphs(text: string, strength: Strength, rand: () => number): string {
  if (strength === 'subtle') return text
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (paras.length <= 1 && strength === 'aggressive') {
    // Break a long single blob into shorter paras
    const sentences = splitSentences(paras[0] || text)
    if (sentences.length >= 4) {
      const chunks: string[] = []
      let buf: string[] = []
      for (const s of sentences) {
        buf.push(s)
        if (buf.length >= 2 + Math.floor(rand() * 2)) {
          chunks.push(buf.join(' '))
          buf = []
        }
      }
      if (buf.length) chunks.push(buf.join(' '))
      return chunks.join('\n\n')
    }
  }
  if (strength === 'aggressive' && paras.length > 2 && rand() > 0.4) {
    // Occasionally merge two short paras
    const out: string[] = []
    for (let i = 0; i < paras.length; i++) {
      if (
        i < paras.length - 1 &&
        paras[i].split(/\s+/).length < 40 &&
        paras[i + 1].split(/\s+/).length < 40 &&
        rand() > 0.5
      ) {
        out.push(paras[i] + ' ' + paras[i + 1])
        i++
      } else {
        out.push(paras[i])
      }
    }
    return out.join('\n\n')
  }
  return text
}

function applyVoice(text: string, voice: Voice, rand: () => number): string {
  switch (voice) {
    case 'casual':
      return text
        .replace(/\btherefore\b/gi, () => pick(['so', 'that\'s why'], rand))
        .replace(/\bhowever\b/gi, () => pick(['but', 'still'], rand))
    case 'professional':
      return text
        .replace(/\bpretty\b/gi, 'fairly')
        .replace(/\ba ton of\b/gi, 'a significant number of')
        .replace(/\bkinda\b/gi, 'somewhat')
        .replace(/\bgonna\b/gi, 'going to')
    case 'academic':
      return text
        .replace(/\bdon't\b/gi, 'do not')
        .replace(/\bcan't\b/gi, 'cannot')
        .replace(/\bwon't\b/gi, 'will not')
        .replace(/\bit's\b/gi, 'it is')
        .replace(/\ba lot of\b/gi, 'a substantial number of')
        .replace(/\bkinda\b/gi, 'somewhat')
    case 'creative':
      return text
        .replace(/\bvery\b/gi, () => (rand() > 0.5 ? pick(['deeply', 'strikingly', 'quietly'], rand) : 'very'))
        .replace(/\bimportant\b/gi, () => pick(['vital', 'weighty', 'pressing'], rand))
    case 'street': {
      // Spektor-flavored dark poetic / confessional
      let out = text
      out = out.replace(/\bhowever\b/gi, () => pick(['still', 'and yet', 'but look'], rand))
      out = out.replace(/\btherefore\b/gi, () => pick(['so', 'and so'], rand))
      out = out.replace(/\bin conclusion\b/gi, () => pick(['bottom line', 'here\'s the cut'], rand))
      if (rand() > 0.6 && !out.includes('—')) {
        out = out.replace(/\. ([A-Z])/g, (m, c) => (rand() > 0.7 ? ` — ${c}` : m))
      }
      return out
    }
    default:
      return text
  }
}

function cleanup(text: string): string {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\ban\s+([bcdfghjklmnpqrstvwxyz])/gi, 'a $1')
    .replace(/\ba\s+([aeiou])/gi, 'an $1')
    .replace(/:\s*,/g, ':')
    .replace(/,\s*,/g, ',')
    .replace(/\s+—\s+—/g, ' —')
    .replace(/^\s*,\s*/gm, '')
    .replace(/\b(Besides|Also|Plus),\s+and\b/gi, '$1,')
    .replace(/\bthese\s+tech\b/gi, 'this tech')
    .replace(/\b(tools|systems|workflows)\s+helps\b/gi, '$1 help')
    .replace(/([.!?])\s*([a-z])/g, (_, p, c) => `${p} ${c.toUpperCase()}`)
    .trim()
}

function processTextBlock(text: string, opts: HumanizeOptions, rand: () => number): string {
  let out = text
  out = replaceAiTells(out, opts.strength, rand)
  out = synonymSwap(out, opts.strength, rand)
  out = injectContractions(out, opts.strength, opts.voice, rand)
  out = hedgeControl(out, opts.hedges, rand)
  out = varyRhythm(out, opts.strength, rand)
  out = reshapeParagraphs(out, opts.strength, rand)
  out = applyVoice(out, opts.voice, rand)
  out = cleanup(out)
  return out
}

/** Run one humanization pass; salt varies output for variants */
export function humanizeOnce(input: string, opts: HumanizeOptions, salt = 1): string {
  if (!input.trim()) return ''
  const rand = seededRandom(hashSeed(input, salt + opts.strength.length * 17 + opts.voice.length * 31))
  const blocks = protectRegions(input, opts.preserve)
  const out = blocks
    .map((b) => (b.type === 'protect' ? b.value : processTextBlock(b.value, opts, rand)))
    .join('')
  return cleanup(out)
}

export function humanizeVariants(input: string, opts: HumanizeOptions): string[] {
  const count = Math.max(1, Math.min(3, opts.variantCount || 3))
  const seen = new Set<string>()
  const variants: string[] = []
  for (let i = 1; i <= count + 2 && variants.length < count; i++) {
    const v = humanizeOnce(input, opts, i * 97 + variants.length * 13)
    if (!seen.has(v) && v.trim()) {
      seen.add(v)
      variants.push(v)
    }
  }
  if (variants.length === 0) variants.push(input)
  return variants
}
