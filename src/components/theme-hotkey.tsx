"use client"

import { minimal } from "@sounds"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useSound } from "@web-kits/audio/react"

import { useTheme } from "@/hooks/use-theme"

/**
 * Registers the global "D" shortcut for switching between light and dark
 * theme. Renders nothing; mount once near the app root so the shortcut is
 * available everywhere. `ignoreInputs` defaults to smart detection, so
 * typing "d" in a text field never triggers it.
 */
export function ThemeHotkey(): null {
  const { theme, toggleTheme } = useTheme()
  const playOn = useSound(minimal.toggleOn)
  const playOff = useSound(minimal.toggleOff)

  useHotkey("D", () => {
    if (theme === "dark") {
      playOn()
    } else {
      playOff()
    }
    toggleTheme()
  })

  return null
}
