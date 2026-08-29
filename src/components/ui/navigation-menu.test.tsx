import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  NavigationMenu,
  NavigationMenuBackdrop,
} from "@/components/ui/navigation-menu"

afterEach(cleanup)

describe("NavigationMenuBackdrop", () => {
  it("stays out of pointer hit testing", () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuBackdrop />
      </NavigationMenu>
    )

    const backdrop = container.querySelector(
      '[data-slot="navigation-menu-backdrop"]'
    )

    expect(backdrop).not.toBeNull()
    expect(backdrop?.classList.contains("pointer-events-none")).toBe(true)
  })
})
