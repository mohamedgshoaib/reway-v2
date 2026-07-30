import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Frame, FrameFooter } from "@/components/ui/frame"

afterEach(cleanup)

describe("Frame", () => {
  it("exposes compact density to its regions", () => {
    const { getByText } = render(
      <Frame density="compact">
        <FrameFooter>Footer</FrameFooter>
      </Frame>
    )
    const footer = getByText("Footer")

    expect(footer.parentElement?.getAttribute("data-density")).toBe("compact")
    expect(footer.className).toContain("in-data-[density=compact]:py-2")
    expect(footer.className).toContain("in-data-[density=compact]:ps-3")
    expect(footer.className).toContain("in-data-[density=compact]:pe-2")
  })

  it("keeps the default density", () => {
    const { getByText } = render(
      <Frame>
        <FrameFooter>Footer</FrameFooter>
      </Frame>
    )

    expect(
      getByText("Footer").parentElement?.getAttribute("data-density")
    ).toBe("default")
  })
})
