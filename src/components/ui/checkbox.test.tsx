import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Checkbox } from "@/components/ui/checkbox"

afterEach(cleanup)

describe("Checkbox", () => {
  it("renders unchecked with no indicator content", () => {
    const { container } = render(<Checkbox />)
    const root = container.querySelector('[data-slot="checkbox"]')

    expect(root?.getAttribute("data-checked")).toBeNull()
    expect(
      container.querySelector('[data-slot="checkbox-indicator"]')
    ).toBeNull()
  })

  it("renders the check indicator when checked", () => {
    const { container } = render(
      <Checkbox checked onCheckedChange={() => {}} />
    )
    const root = container.querySelector('[data-slot="checkbox"]')

    expect(root?.getAttribute("data-checked")).toBe("")
    expect(root?.getAttribute("aria-checked")).toBe("true")
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("indeterminate takes priority over checked visually", () => {
    const { container } = render(
      <Checkbox checked indeterminate onCheckedChange={() => {}} />
    )
    const root = container.querySelector('[data-slot="checkbox"]')

    // Base UI's own state-attribute mapping skips `data-checked` entirely
    // while indeterminate is true (checkbox/utils/useStateAttributesMapping.js) —
    // `aria-checked="mixed"` and `data-indeterminate` are the only signals.
    expect(root?.hasAttribute("data-checked")).toBe(false)
    expect(root?.getAttribute("data-indeterminate")).toBe("")
    expect(root?.getAttribute("aria-checked")).toBe("mixed")
  })

  it("fires onCheckedChange with the new value when clicked", () => {
    let lastChecked: boolean | undefined
    const { container } = render(
      <Checkbox onCheckedChange={(checked) => (lastChecked = checked)} />
    )
    const root = container.querySelector('[data-slot="checkbox"]')
    expect(root).not.toBeNull()

    fireEvent.click(root as Element)

    expect(lastChecked).toBe(true)
  })

  it("can remove motion and sound feedback for frequent selection", () => {
    const { container } = render(<Checkbox checked sound={false} static />)
    const root = container.querySelector('[data-slot="checkbox"]')

    expect(root?.className).not.toContain("scale-97")
    expect(container.querySelector("svg")).not.toBeNull()
  })
})
