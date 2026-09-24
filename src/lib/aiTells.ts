import type { AiTellMatch } from '../types'

/** Common AI-sounding openers / transitions / hedges — replacements keep grammar intact */
export const AI_TELL_PHRASES: { phrase: string; category: string; replacements: string[] }[] = [
  { phrase: "in today's world,", category: 'opener', replacements: ['these days,', 'right now,', 'nowadays,'] },
  { phrase: "in today's world", category: 'opener', replacements: ['these days', 'right now', 'nowadays'] },
  { phrase: "in today's fast-paced environment,", category: 'opener', replacements: ['in this rushed world,', 'with everything moving so fast,'] },
  { phrase: "in today's fast-paced", category: 'opener', replacements: ['in this rushed', 'in our hurried'] },
  { phrase: 'it is important to note that', category: 'filler', replacements: ['note that', "it's worth saying that", 'keep in mind that'] },
  { phrase: 'it is worth mentioning that', category: 'filler', replacements: ['also,', "worth adding:", 'and'] },
  { phrase: 'it is crucial to recognize that', category: 'filler', replacements: ['remember that', 'the thing is,', 'honestly,'] },
  { phrase: 'it goes without saying that', category: 'filler', replacements: ['obviously,', 'of course,', 'clearly,'] },
  { phrase: 'needless to say,', category: 'filler', replacements: ['obviously,', 'of course,'] },
  { phrase: 'needless to say', category: 'filler', replacements: ['obviously', 'of course'] },
  { phrase: 'furthermore,', category: 'transition', replacements: ['also,', 'and', 'plus,', 'on top of that,'] },
  { phrase: 'furthermore', category: 'transition', replacements: ['also', 'and', 'plus', 'on top of that'] },
  { phrase: 'moreover,', category: 'transition', replacements: ['also,', "what's more,", 'besides,'] },
  { phrase: 'moreover', category: 'transition', replacements: ['also', "what's more", 'besides'] },
  { phrase: 'additionally,', category: 'transition', replacements: ['also,', 'and', 'plus,', 'another thing:'] },
  { phrase: 'additionally', category: 'transition', replacements: ['also', 'and', 'plus'] },
  { phrase: 'in conclusion,', category: 'closer', replacements: ['so,', 'all in all,', 'bottom line:', 'to wrap up,'] },
  { phrase: 'in conclusion', category: 'closer', replacements: ['so', 'all in all', 'bottom line'] },
  { phrase: 'to summarize,', category: 'closer', replacements: ['in short,', 'so,', 'basically,'] },
  { phrase: 'to summarize', category: 'closer', replacements: ['in short', 'so', 'basically'] },
  { phrase: 'in summary,', category: 'closer', replacements: ['short version:', 'so,', 'basically,'] },
  { phrase: 'in summary', category: 'closer', replacements: ['short version', 'so', 'basically'] },
  { phrase: 'leveraging', category: 'jargon', replacements: ['using', 'tapping into', 'working with'] },
  { phrase: 'leverage', category: 'jargon', replacements: ['use', 'tap into', 'work with', 'rely on'] },
  { phrase: 'utilization of', category: 'jargon', replacements: ['use of', ''] },
  { phrase: 'utilization', category: 'jargon', replacements: ['use', 'usage'] },
  { phrase: 'utilize', category: 'jargon', replacements: ['use', 'apply'] },
  { phrase: 'facilitates', category: 'jargon', replacements: ['helps', 'enables', 'supports'] },
  { phrase: 'facilitate', category: 'jargon', replacements: ['help', 'enable', 'support'] },
  { phrase: 'enhanced', category: 'jargon', replacements: ['better', 'improved', 'stronger'] },
  { phrase: 'enhance', category: 'jargon', replacements: ['improve', 'boost', 'sharpen'] },
  { phrase: 'optimize', category: 'jargon', replacements: ['improve', 'tune', 'streamline'] },
  { phrase: 'robust', category: 'jargon', replacements: ['solid', 'strong', 'reliable'] },
  { phrase: 'seamless', category: 'jargon', replacements: ['smooth', 'easy', 'frictionless'] },
  { phrase: 'cutting-edge', category: 'jargon', replacements: ['new', 'latest', 'advanced'] },
  { phrase: 'state-of-the-art', category: 'jargon', replacements: ['modern', 'top-tier', 'advanced'] },
  { phrase: 'innovative', category: 'jargon', replacements: ['new', 'fresh', 'clever'] },
  { phrase: 'myriad', category: 'pompous', replacements: ['many', 'countless', 'a ton of', 'lots of'] },
  { phrase: 'plethora of', category: 'pompous', replacements: ['plenty of', 'a lot of', 'heaps of'] },
  { phrase: 'plethora', category: 'pompous', replacements: ['plenty', 'a lot'] },
  { phrase: 'delve into', category: 'cliche', replacements: ['look at', 'dig into', 'explore', 'unpack'] },
  { phrase: 'delve', category: 'cliche', replacements: ['dig', 'look', 'explore'] },
  { phrase: 'the landscape of', category: 'cliche', replacements: ['the world of', 'the field of', ''] },
  { phrase: 'landscape', category: 'cliche', replacements: ['space', 'field', 'world', 'scene'] },
  { phrase: 'ever-evolving', category: 'cliche', replacements: ['changing', 'shifting', 'moving'] },
  { phrase: 'pave the way for', category: 'cliche', replacements: ['open doors to', 'make room for', 'set up'] },
  { phrase: 'pave the way', category: 'cliche', replacements: ['open doors', 'make room', 'set things up'] },
  { phrase: 'unprecedented', category: 'pompous', replacements: ['rare', 'new', 'unusual', 'unheard-of'] },
  { phrase: 'holistic', category: 'jargon', replacements: ['full', 'whole', 'complete'] },
  { phrase: 'synergistic', category: 'jargon', replacements: ['combined', 'joint', 'collaborative'] },
  { phrase: 'synergy', category: 'jargon', replacements: ['teamwork', 'combined force', 'chemistry'] },
  { phrase: 'paradigm', category: 'jargon', replacements: ['model', 'approach', 'way of thinking'] },
  { phrase: 'in order to', category: 'filler', replacements: ['to'] },
  { phrase: 'due to the fact that', category: 'filler', replacements: ['because', 'since', 'as'] },
  { phrase: 'a wide range of', category: 'filler', replacements: ['many', 'various', 'all kinds of'] },
  { phrase: 'plays a vital role in', category: 'cliche', replacements: ['matters for', 'is key to', 'helps with'] },
  { phrase: 'plays a vital role', category: 'cliche', replacements: ['matters', 'counts', 'is key', 'helps a lot'] },
  { phrase: 'plays a crucial role', category: 'cliche', replacements: ['matters', 'is central', 'drives things'] },
  { phrase: 'at the end of the day', category: 'cliche', replacements: ['in the end', 'ultimately', 'when it counts'] },
  { phrase: 'game-changer', category: 'cliche', replacements: ['big shift', 'real change', 'breakthrough'] },
  { phrase: 'underscores', category: 'pompous', replacements: ['shows', 'highlights', 'makes clear'] },
  { phrase: 'underscoring', category: 'pompous', replacements: ['showing', 'highlighting'] },
  { phrase: 'testament to', category: 'pompous', replacements: ['proof of', 'sign of', 'evidence of'] },
  { phrase: 'an integral part of', category: 'filler', replacements: ['part of', 'woven into', 'woven through'] },
  { phrase: 'integral part of', category: 'filler', replacements: ['part of', 'woven into'] },
  { phrase: 'operational frameworks', category: 'jargon', replacements: ['workflows', 'systems', 'day-to-day ops'] },
  { phrase: 'across various domains', category: 'filler', replacements: ['in many areas', 'across fields', 'in different places'] },
  { phrase: 'one must consider', category: 'pompous', replacements: ['consider', 'think about', 'look at'] },
  { phrase: 'it should be noted that', category: 'filler', replacements: ['note that', 'also,'] },
  { phrase: 'as previously mentioned', category: 'filler', replacements: ['as I said', 'again'] },
  { phrase: 'when it comes to', category: 'filler', replacements: ['for', 'with', 'regarding'] },
  { phrase: 'AI-powered solutions', category: 'jargon', replacements: ['AI tools', 'AI systems', 'machine-learning tools'] },
  { phrase: 'sophisticated technologies', category: 'jargon', replacements: ['tools', 'systems', 'new tools'] },
]

export function scanAiTells(text: string): AiTellMatch[] {
  const lower = text.toLowerCase()
  const results: AiTellMatch[] = []
  const covered = new Set<string>()

  const sorted = [...AI_TELL_PHRASES].sort((a, b) => b.phrase.length - a.phrase.length)

  for (const entry of sorted) {
    const phrase = entry.phrase.toLowerCase()
    // Skip if a longer phrase that contains this already dominates counts visually —
    // still count independently for scanner accuracy
    const indices: number[] = []
    let pos = 0
    while (pos < lower.length) {
      const idx = lower.indexOf(phrase, pos)
      if (idx === -1) break
      const key = `${idx}:${phrase.length}`
      if (!covered.has(key)) {
        indices.push(idx)
        // mark range
        for (let k = idx; k < idx + phrase.length; k++) covered.add(`${k}:1`)
      }
      pos = idx + phrase.length
    }
    if (indices.length > 0) {
      results.push({
        phrase: entry.phrase,
        count: indices.length,
        category: entry.category,
        indices,
      })
    }
  }

  return results.sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
}

export function roboticScoreFromTells(text: string, tells: AiTellMatch[]): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1
  const tellHits = tells.reduce((s, t) => s + t.count, 0)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length)
  const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0
  const variance =
    lengths.length > 1
      ? lengths.reduce((s, l) => s + (l - avg) ** 2, 0) / lengths.length
      : 0
  const lowVariancePenalty = variance < 20 ? 15 : variance < 40 ? 8 : 0
  const longSentencePenalty = avg > 22 ? 12 : avg > 18 ? 6 : 0
  const density = (tellHits / words) * 1000
  const score = Math.min(
    100,
    Math.round(density * 8 + lowVariancePenalty + longSentencePenalty + tellHits * 3),
  )
  return score
}
