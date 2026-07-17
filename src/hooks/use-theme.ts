"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "theme"

export type Theme = "light" | "dark"

function readDomTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

// Module-level store: the DOM (via the pre-hydration script in __root.tsx)
// is the source of truth for the theme actually painted, so the store
// initializes from it rather than re-deriving from storage.
let currentTheme: Theme = readDomTheme()
const listeners = new Set<() => void>()

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark")
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage may be unavailable (private mode, disabled cookies, etc.).
    // The theme still applies for the current session.
  }
}

export function setTheme(theme: Theme): void {
  if (theme === currentTheme) return
  currentTheme = theme
  applyTheme(theme)
  for (const listener of listeners) listener()
}

export function toggleTheme(): void {
  setTheme(currentTheme === "dark" ? "light" : "dark")
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): Theme {
  return currentTheme
}

function getServerSnapshot(): Theme {
  return "light"
}

export function useTheme(): {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
} {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    theme,
    setTheme: useCallback((next: Theme) => setTheme(next), []),
    toggleTheme: useCallback(() => toggleTheme(), []),
  }
}

/**
 * Inline, pre-hydration script string for the document head. Reads the
 * stored theme and applies the `dark` class before first paint so there is
 * no flash and no hydration mismatch. Reway defaults to light; dark only
 * applies when a person has explicitly chosen it before.
 */
export const themeInitScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})()`
