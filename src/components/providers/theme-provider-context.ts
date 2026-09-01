import { createContext } from "react"

import type { Theme } from "@/lib/theme-store"

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeProviderContext = createContext<
  ThemeProviderState | undefined
>(undefined)
