export interface DiffChunk {
  type: 'equal' | 'add' | 'remove'
  value: string
}

/** Simple word-level LCS diff */
export function wordDiff(a: string, b: string): DiffChunk[] {
  const aw = tokenize(a)
  const bw = tokenize(b)
  const n = aw.length
  const m = bw.length
  // Limit for performance
  if (n * m > 250000) {
    return sentenceFallback(a, b)
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (aw[i] === bw[j]) dp[i][j] = dp[i + 1][j + 1] + 1
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const chunks: DiffChunk[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (aw[i] === bw[j]) {
      push(chunks, 'equal', aw[i])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(chunks, 'remove', aw[i])
      i++
    } else {
      push(chunks, 'add', bw[j])
      j++
    }
  }
  while (i < n) {
    push(chunks, 'remove', aw[i++])
  }
  while (j < m) {
    push(chunks, 'add', bw[j++])
  }
  return mergeChunks(chunks)
}

function tokenize(s: string): string[] {
  return s.split(/(\s+)/).filter((t) => t.length > 0)
}

function push(chunks: DiffChunk[], type: DiffChunk['type'], value: string) {
  const last = chunks[chunks.length - 1]
  if (last && last.type === type) last.value += value
  else chunks.push({ type, value })
}

function mergeChunks(chunks: DiffChunk[]): DiffChunk[] {
  return chunks
}

function sentenceFallback(a: string, b: string): DiffChunk[] {
  if (a === b) return [{ type: 'equal', value: a }]
  return [
    { type: 'remove', value: a },
    { type: 'add', value: b },
  ]
}
