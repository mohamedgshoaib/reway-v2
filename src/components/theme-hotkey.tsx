"use client"

import { useHotkey } from "@tanstack/react-hotkeys"

import { useTheme } from "@/hooks/use-theme"

/**
 * Registers the global "D" shortcut for switching between light and dark
 * theme. Renders nothing; mount once near the app root so the shortcut is
 * available everywhere. `ignoreInputs` defaults to smart detection, so
 * typing "d" in a text field never triggers it.
 */
export function ThemeHotkey(): null {
  const { toggleTheme } = useTheme()

  useHotkey("D", toggleTheme)

  return null
}
