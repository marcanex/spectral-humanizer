import type { AppSettings, HistoryEntry, LibraryItem } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const SETTINGS_KEY = 'spectral-humanizer:settings'
const HISTORY_KEY = 'spectral-humanizer:history'
const LIBRARY_KEY = 'spectral-humanizer:library'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  // Cap at 80
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 80)))
}

export function loadLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    return raw ? (JSON.parse(raw) as LibraryItem[]) : []
  } catch {
    return []
  }
}

export function saveLibrary(items: LibraryItem[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, 100)))
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
