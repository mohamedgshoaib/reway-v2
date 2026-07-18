import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

afterEach(cleanup)

describe("Toggle", () => {
  it("toggles pressed state and fires onPressedChange on click", () => {
    let lastPressed: boolean | undefined
    const { getByRole } = render(
      <Toggle onPressedChange={(pressed) => (lastPressed = pressed)}>
        Bold
      </Toggle>
    )
    const button = getByRole("button")
    expect(button.getAttribute("data-pressed")).toBeNull()
    expect(button.getAttribute("aria-pressed")).toBe("false")

    fireEvent.click(button)
    expect(lastPressed).toBe(true)
    expect(button.getAttribute("data-pressed")).toBe("")
    expect(button.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(button)
    expect(lastPressed).toBe(false)
    expect(button.getAttribute("data-pressed")).toBeNull()
  })
})

describe("ToggleGroup", () => {
  it("single-select mode: pressing an item deselects the previous one", () => {
    let value: string[] = []
    const { getByText } = render(
      <ToggleGroup onValueChange={(next) => (value = next)}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>
    )

    fireEvent.click(getByText("Bold"))
    expect(value).toEqual(["bold"])

    fireEvent.click(getByText("Italic"))
    expect(value).toEqual(["italic"])
  })

  it("single-select mode: pressing the active item deselects it", () => {
    let value: string[] = ["bold"]
    const { getByText } = render(
      <ToggleGroup value={value} onValueChange={(next) => (value = next)}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>
    )

    fireEvent.click(getByText("Bold"))
    expect(value).toEqual([])
  })

  it("multiple mode: accumulates and removes independently", () => {
    let value: string[] = []
    const { getByText } = render(
      <ToggleGroup multiple onValueChange={(next) => (value = next)}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>
    )

    fireEvent.click(getByText("Bold"))
    expect(value).toEqual(["bold"])

    fireEvent.click(getByText("Italic"))
    expect(value).toEqual(["bold", "italic"])

    fireEvent.click(getByText("Bold"))
    expect(value).toEqual(["italic"])
  })
})
