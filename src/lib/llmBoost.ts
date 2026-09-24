import type { HumanizeOptions, Voice } from '../types'

const VOICE_HINT: Record<Voice, string> = {
  casual: 'casual, conversational, natural spoken rhythm',
  professional: 'clear professional prose without corporate fluff',
  academic: 'precise academic tone, avoid slang, keep formality',
  creative: 'literary, vivid, textured language with personality',
  street: 'confessional, dark-poetic, Spektor-flavored, intimate and raw',
}

export async function llmRewrite(
  input: string,
  opts: HumanizeOptions,
  config: { apiKey: string; baseUrl: string; model: string },
  signal?: AbortSignal,
): Promise<string> {
  const base = config.baseUrl.replace(/\/$/, '')
  const system = `You rewrite stiff or AI-sounding writing into natural human prose.
Rules:
- Preserve meaning exactly. Do not invent facts.
- Strength: ${opts.strength}. Voice: ${VOICE_HINT[opts.voice]}.
- Strip filler openers and robotic transitions.
- Vary sentence length. Prefer contractions where the voice allows.
- ${opts.preserve.quotes ? 'Keep quoted text unchanged. ' : ''}
- ${opts.preserve.markdown ? 'Preserve markdown structure. ' : ''}
- ${opts.preserve.urls ? 'Keep URLs intact. ' : ''}
- ${opts.preserve.codeFences ? 'Keep code fences unchanged. ' : ''}
- Output ONLY the rewritten text. No preamble.`

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: opts.strength === 'aggressive' ? 0.9 : opts.strength === 'subtle' ? 0.4 : 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: input },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`LLM error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty LLM response')
  return content
}
