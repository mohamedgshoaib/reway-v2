const STORAGE_KEY = "theme"
const DEFAULT_THEME = "light" as const
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)"

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = Exclude<Theme, "system">

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system"
}

function readStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return DEFAULT_THEME

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

let currentTheme = readStoredTheme()
const listeners = new Set<() => void>()

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme
  if (typeof window === "undefined") return DEFAULT_THEME

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light"
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return

  const resolved = resolveTheme(theme)
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

function notify(): void {
  for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return

  const next = isTheme(event.newValue) ? event.newValue : DEFAULT_THEME
  if (next === currentTheme) return

  currentTheme = next
  applyTheme(next)
  notify()
}

function onSystemThemeChange(): void {
  if (currentTheme === "system") applyTheme("system")
}

export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener)

  if (typeof window !== "undefined" && listeners.size === 1) {
    window.addEventListener("storage", onStorage)
    window
      .matchMedia(DARK_MEDIA_QUERY)
      .addEventListener("change", onSystemThemeChange)
  }

  return () => {
    listeners.delete(listener)

    if (typeof window !== "undefined" && listeners.size === 0) {
      window.removeEventListener("storage", onStorage)
      window
        .matchMedia(DARK_MEDIA_QUERY)
        .removeEventListener("change", onSystemThemeChange)
    }
  }
}

export function getThemeSnapshot(): Theme {
  return currentTheme
}

export function getServerThemeSnapshot(): Theme {
  return DEFAULT_THEME
}

export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(currentTheme)
}

export function setStoredTheme(theme: Theme): void {
  if (theme === currentTheme) return

  currentTheme = theme
  applyTheme(theme)

  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage may be unavailable. The theme still applies for this session.
  }

  notify()
}

export const themeInitScript = `(function(){var t="light";try{var s=localStorage.getItem("theme");if(s==="light"||s==="dark"||s==="system")t=s}catch(e){}var r=t;if(t==="system"){try{r=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){r="light"}}var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(r);e.style.colorScheme=r})()`
