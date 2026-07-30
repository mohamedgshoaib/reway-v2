import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ScrollArea } from "@/components/ui/scroll-area"

afterEach(cleanup)

describe("ScrollArea", () => {
  it("omits scrollbar chrome when requested", () => {
    const { container } = render(
      <ScrollArea hideScrollbar>
        <div>Scrollable content</div>
      </ScrollArea>
    )

    expect(
      container.querySelector("[data-slot='scroll-area-scrollbar']")
    ).toBeNull()
    expect(
      container.querySelector("[data-slot='scroll-area-corner']")
    ).toBeNull()
    expect(
      container.querySelector("[data-slot='scroll-area-viewport']")
    ).not.toBeNull()
  })
})
