import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ToastProvider, toastManager } from "@/components/ui/toast"

beforeEach(() => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true)
  toastManager.close()
})

afterEach(() => {
  cleanup()
  toastManager.close()
  vi.restoreAllMocks()
})

function renderTrigger(addToast: () => void, label = "Show toast"): void {
  render(
    <ToastProvider>
      <button onClick={addToast} type="button">
        {label}
      </button>
    </ToastProvider>
  )
}

describe("ToastProvider", () => {
  it("centers the default toast position on mobile", () => {
    renderTrigger(() => {
      toastManager.add({ title: "Saved", type: "success" })
    })

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }))

    const viewport = document.querySelector('[data-slot="toast-viewport"]')
    const popup = document.querySelector('[data-slot="toast-popup"]')
    expect(viewport?.getAttribute("data-position")).toBe("bottom-center")
    expect(popup?.getAttribute("data-position")).toBe("bottom-center")
  })

  it("aligns the icon slot with the first description line when no title exists", () => {
    renderTrigger(() => {
      toastManager.add({
        description: "Bookmark added to your library.",
        type: "success",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }))

    const description = screen.getByText("Bookmark added to your library.")
    const popup = description.closest('[data-slot="toast-popup"]')
    const icon = popup?.querySelector('[data-slot="toast-icon"]')
    const animatedIcon = icon?.querySelector("span")

    expect(popup).not.toBeNull()
    expect(icon?.classList.contains("h-lh")).toBe(true)
    expect(icon?.classList.contains("w-4")).toBe(true)
    expect(animatedIcon?.classList.contains("-translate-y-px")).toBe(true)
    expect(popup?.querySelector('[data-slot="toast-title"]')).toBeNull()
  })

  it("shows the rounded four-second timer only for timed action toasts", () => {
    renderTrigger(() => {
      const toastId = toastManager.add({
        actionProps: {
          children: "Undo",
          onClick: () => toastManager.close(toastId),
        },
        description: "Bookmark moved to Trash.",
        title: "Deleted",
        type: "success",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }))

    const track = document.querySelector('[data-slot="toast-timeout-track"]')
    const indicator = document.querySelector(
      '[data-slot="toast-timeout-indicator"]'
    )

    expect(screen.getByRole("button", { name: "Undo" })).not.toBeNull()
    expect(track?.classList.contains("inset-0")).toBe(true)
    expect(track?.classList.contains("rounded-[inherit]")).toBe(true)
    expect(indicator?.classList.contains("animate-toast-timeout")).toBe(true)
    expect(indicator?.classList.contains("bg-foreground/20")).toBe(true)
    expect(indicator?.classList.contains("bottom-0")).toBe(true)
    expect(indicator?.classList.contains("h-0.5")).toBe(true)
  })

  it("keeps persistent action toasts free of a misleading timer", () => {
    renderTrigger(() => {
      toastManager.add({
        actionProps: { children: "Retry" },
        description: "Try the action again.",
        timeout: 0,
        title: "Action failed",
        type: "error",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }))

    expect(screen.getByRole("button", { name: "Retry" })).not.toBeNull()
    expect(
      document.querySelector('[data-slot="toast-timeout-track"]')
    ).toBeNull()
  })

  it("exposes window activity so the CSS timer pauses with Base UI", async () => {
    renderTrigger(() => {
      toastManager.add({
        actionProps: { children: "Undo" },
        description: "Bookmark moved to Trash.",
        title: "Deleted",
        type: "success",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }))
    const viewport = document.querySelector('[data-slot="toast-viewport"]')
    expect(viewport?.getAttribute("data-window-active")).toBe("true")

    vi.spyOn(document, "hasFocus").mockReturnValue(false)
    fireEvent.blur(window)

    await waitFor(() => {
      expect(viewport?.getAttribute("data-window-active")).toBe("false")
    })
  })
})
