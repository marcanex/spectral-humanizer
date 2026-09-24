export type Strength = 'subtle' | 'balanced' | 'aggressive'
export type Voice =
  | 'casual'
  | 'professional'
  | 'academic'
  | 'creative'
  | 'street'

export interface PreserveOptions {
  quotes: boolean
  markdown: boolean
  urls: boolean
  codeFences: boolean
}

export interface HumanizeOptions {
  strength: Strength
  voice: Voice
  preserve: PreserveOptions
  hedges: 'less' | 'same' | 'more'
  variantCount: number
}

export interface AiTellMatch {
  phrase: string
  count: number
  category: string
  indices: number[]
}

export interface TextStats {
  words: number
  chars: number
  sentences: number
  avgSentenceLength: number
  flesch: number
  roboticScore: number
}

export interface HistoryEntry {
  id: string
  createdAt: number
  input: string
  output: string
  voice: Voice
  strength: Strength
  label?: string
}

export interface LibraryItem {
  id: string
  createdAt: number
  text: string
  title: string
  pinned?: boolean
  tags?: string[]
}

export interface AppSettings {
  accent: 'purple' | 'magenta' | 'ember' | 'cyan'
  defaultStrength: Strength
  defaultVoice: Voice
  autoHumanizeOnPaste: boolean
  syncScroll: boolean
  llmEnabled: boolean
  llmApiKey: string
  llmBaseUrl: string
  llmModel: string
  onboardingDone: boolean
  hedgeDefault: 'less' | 'same' | 'more'
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

export const DEFAULT_PRESERVE: PreserveOptions = {
  quotes: true,
  markdown: true,
  urls: true,
  codeFences: true,
}

export const DEFAULT_SETTINGS: AppSettings = {
  accent: 'purple',
  defaultStrength: 'balanced',
  defaultVoice: 'casual',
  autoHumanizeOnPaste: false,
  syncScroll: true,
  llmEnabled: false,
  llmApiKey: '',
  llmBaseUrl: 'https://api.openai.com/v1',
  llmModel: 'gpt-4o-mini',
  onboardingDone: false,
  hedgeDefault: 'same',
}

export const VOICE_LABELS: Record<Voice, string> = {
  casual: 'Casual',
  professional: 'Professional',
  academic: 'Academic',
  creative: 'Creative / Literary',
  street: 'Street / Confessional',
}

export const STRENGTH_LABELS: Record<Strength, string> = {
  subtle: 'Subtle',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
}
