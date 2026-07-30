import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

afterEach(cleanup)

describe("Toggle", () => {
  it("keeps standalone state paint full-size", () => {
    const { getByRole } = render(<Toggle>Bold</Toggle>)

    expect(getByRole("button").className).toContain("before:inset-0")
  })

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
  it("separates state paint along the group orientation", () => {
    const { getByText, rerender } = render(
      <ToggleGroup>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      </ToggleGroup>
    )

    const horizontalClasses = getByText("Bold").className.split(" ")
    expect(horizontalClasses).toContain("before:inset-x-px")
    expect(horizontalClasses).toContain("before:inset-y-0")
    expect(horizontalClasses).not.toContain("before:inset-0")

    rerender(
      <ToggleGroup orientation="vertical">
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      </ToggleGroup>
    )

    const verticalClasses = getByText("Bold").className.split(" ")
    expect(verticalClasses).toContain("before:inset-x-0")
    expect(verticalClasses).toContain("before:inset-y-px")
    expect(verticalClasses).not.toContain("before:inset-0")
  })

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
