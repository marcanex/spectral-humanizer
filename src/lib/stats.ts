import type { TextStats } from '../types'
import { roboticScoreFromTells, scanAiTells } from './aiTells'

export function computeStats(text: string): TextStats {
  const trimmed = text.trim()
  if (!trimmed) {
    return { words: 0, chars: 0, sentences: 0, avgSentenceLength: 0, flesch: 0, roboticScore: 0 }
  }

  const words = trimmed.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const chars = trimmed.length
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const sentenceCount = Math.max(1, sentences.length)
  const avgSentenceLength = wordCount / sentenceCount

  // Approximate syllables
  let syllables = 0
  for (const w of words) {
    syllables += countSyllables(w)
  }
  // Flesch Reading Ease
  const flesch = Math.round(
    206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount),
  )

  const tells = scanAiTells(trimmed)
  const roboticScore = roboticScoreFromTells(trimmed, tells)

  return {
    words: wordCount,
    chars,
    sentences: sentenceCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    flesch: Math.max(0, Math.min(120, flesch)),
    roboticScore,
  }
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

export function fleschLabel(score: number): string {
  if (score >= 90) return 'Very easy'
  if (score >= 80) return 'Easy'
  if (score >= 70) return 'Fairly easy'
  if (score >= 60) return 'Standard'
  if (score >= 50) return 'Fairly hard'
  if (score >= 30) return 'Hard'
  return 'Very hard'
}
