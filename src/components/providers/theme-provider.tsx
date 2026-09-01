"use client"

import { minimal } from "@sounds"
import { useHotkey } from "@tanstack/react-hotkeys"
import { ScriptOnce } from "@tanstack/react-router"
import { useSound } from "@web-kits/audio/react"
import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { ThemeProviderContext } from "@/components/providers/theme-provider-context"
import {
  getResolvedTheme,
  getServerThemeSnapshot,
  getThemeSnapshot,
  resolveTheme,
  setStoredTheme,
  subscribeToTheme,
  themeInitScript,
} from "@/lib/theme-store"
import type { Theme } from "@/lib/theme-store"

export function ThemeScript(): React.ReactElement {
  return <ScriptOnce>{themeInitScript}</ScriptOnce>
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  )
  const playToggleOn = useSound(minimal.toggleOn)
  const playToggleOff = useSound(minimal.toggleOff)

  const setTheme = useCallback(
    (next: Theme) => {
      if (next === theme) return

      if (resolveTheme(next) === "dark") playToggleOn()
      else playToggleOff()
      setStoredTheme(next)
    },
    [playToggleOff, playToggleOn, theme]
  )

  const toggleTheme = useCallback(() => {
    setTheme(getResolvedTheme() === "dark" ? "light" : "dark")
  }, [setTheme])

  useHotkey("D", toggleTheme, {
    ignoreInputs: true,
    preventDefault: true,
    requireReset: true,
  })

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [setTheme, theme, toggleTheme]
  )

  return <ThemeProviderContext value={value}>{children}</ThemeProviderContext>
}
