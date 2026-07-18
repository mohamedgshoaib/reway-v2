const ENABLED_STORAGE_KEY = "sound-enabled"
const VOLUME_STORAGE_KEY = "sound-volume"

const DEFAULT_ENABLED = true
const DEFAULT_VOLUME = 0.8

function readStoredEnabled(): boolean {
  if (typeof localStorage === "undefined") return DEFAULT_ENABLED
  try {
    const stored = localStorage.getItem(ENABLED_STORAGE_KEY)
    return stored === null ? DEFAULT_ENABLED : stored === "true"
  } catch {
    return DEFAULT_ENABLED
  }
}

function readStoredVolume(): number {
  if (typeof localStorage === "undefined") return DEFAULT_VOLUME
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (stored === null) return DEFAULT_VOLUME
    const parsed = Number(stored)
    return Number.isFinite(parsed)
      ? Math.min(1, Math.max(0, parsed))
      : DEFAULT_VOLUME
  } catch {
    return DEFAULT_VOLUME
  }
}

// Module-level store, same shape as use-theme.ts: initializes from
// localStorage once, then is the single source of truth for the session.
let currentEnabled: boolean = readStoredEnabled()
let currentVolume: number = readStoredVolume()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function setSoundEnabled(enabled: boolean): void {
  if (enabled === currentEnabled) return
  currentEnabled = enabled
  try {
    localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled))
  } catch {
    // Storage may be unavailable (private mode, disabled cookies, etc.).
    // The setting still applies for the current session.
  }
  notify()
}

export function setSoundVolume(volume: number): void {
  const clamped = Math.min(1, Math.max(0, volume))
  if (clamped === currentVolume) return
  currentVolume = clamped
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped))
  } catch {
    // Storage may be unavailable (private mode, disabled cookies, etc.).
    // The setting still applies for the current session.
  }
  notify()
}

export function subscribeToSoundSettings(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getSoundEnabled(): boolean {
  return currentEnabled
}

export function getSoundVolume(): number {
  return currentVolume
}

export function getDefaultSoundEnabled(): boolean {
  return DEFAULT_ENABLED
}

export function getDefaultSoundVolume(): number {
  return DEFAULT_VOLUME
}
