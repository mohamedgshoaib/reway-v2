import { afterEach, describe, expect, it, vi } from "vitest"

import { getThemeSnapshot, setStoredTheme } from "@/lib/theme-store"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("theme transitions", () => {
  it("suppresses transitions while applying a theme", () => {
    const animationFrames: FrameRequestCallback[] = []
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        animationFrames.push(callback)
        return animationFrames.length
      })
    )

    const nextTheme = getThemeSnapshot() === "dark" ? "light" : "dark"
    setStoredTheme(nextTheme)

    const override = Array.from(document.head.querySelectorAll("style")).find(
      (style) => style.textContent?.includes("transition:none!important")
    )

    expect(override).not.toBeUndefined()
    expect(document.documentElement.classList.contains(nextTheme)).toBe(true)

    animationFrames.shift()?.(0)
    animationFrames.shift()?.(0)

    expect(override?.isConnected).toBe(false)
  })
})
