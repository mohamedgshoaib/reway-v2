import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AnimatedIcon } from "@/components/ui/animated-icon"

afterEach(cleanup)

describe("AnimatedIcon", () => {
  it("renders its child", () => {
    const { getByText } = render(
      <AnimatedIcon transitionKey="a">a-icon</AnimatedIcon>
    )

    expect(getByText("a-icon")).not.toBeNull()
  })

  it("swaps content when transitionKey changes", async () => {
    const { getByText, rerender } = render(
      <AnimatedIcon transitionKey="a">a-icon</AnimatedIcon>
    )
    expect(getByText("a-icon")).not.toBeNull()

    rerender(<AnimatedIcon transitionKey="b">b-icon</AnimatedIcon>)

    await vi.waitFor(() => {
      expect(getByText("b-icon")).not.toBeNull()
    })
  })

  it("doesn't throw or leave stale nodes when the key changes faster than the spring settles", async () => {
    const consoleError = vi.spyOn(console, "error")
    const { container, getByText, rerender } = render(
      <AnimatedIcon transitionKey={0}>icon-0</AnimatedIcon>
    )

    // The spring's own duration is 300ms — rerender far faster than that,
    // synchronously, mirroring a checkbox spammed between checked/indeterminate
    // (verified live in the browser for plan 002; this checks the same
    // guarantee holds at the component level, without real timers).
    for (let key = 1; key <= 8; key += 1) {
      rerender(<AnimatedIcon transitionKey={key}>{`icon-${key}`}</AnimatedIcon>)
    }

    await vi.waitFor(() => {
      expect(getByText("icon-8")).not.toBeNull()
    })

    // Only the settled, final icon should remain — no exiting duplicates stuck
    // mid-animation.
    expect(container.querySelectorAll("span").length).toBe(1)
    expect(consoleError).not.toHaveBeenCalled()
  })
})
