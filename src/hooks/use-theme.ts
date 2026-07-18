"use client"

import { use } from "react"

import { ThemeProviderContext } from "@/components/providers/theme-provider"

export function useTheme() {
  const context = use(ThemeProviderContext)

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }

  return context
}
