import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CollectionIconPicker } from "@/dev/dashboard-ui/collection-icon-picker"

afterEach(cleanup)

describe("collection icon picker", () => {
  it("shows grouped named choices and filters aliases", async () => {
    const onSelect = vi.fn<(icon: string) => void>()

    render(
      <CollectionIconPicker
        color={{ kind: "palette", value: "blue" }}
        onSelect={onSelect}
        selectedIcon="folder"
      />
    )

    const iconField = screen.getByRole("combobox", {
      name: "Collection icon",
    })
    expect((iconField as HTMLInputElement).value).toBe("Folder")
    expect(iconField.className).not.toContain("cursor-pointer")

    const trigger = iconField
      .closest("[data-slot=combobox-input-group]")
      ?.querySelector<HTMLElement>("[data-slot=combobox-trigger]")
    expect(trigger).not.toBeNull()
    fireEvent.click(trigger as HTMLElement)
    expect(await screen.findByText("General")).not.toBeNull()
    expect(screen.getByRole("option", { name: "Folder" })).not.toBeNull()
    expect(screen.getByRole("option", { name: "Briefcase" })).not.toBeNull()

    fireEvent.change(iconField, { target: { value: "recipe" } })
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Cooking" })).not.toBeNull()
    })
    fireEvent.click(screen.getByRole("option", { name: "Cooking" }))
    expect(onSelect).toHaveBeenCalledWith("cooking")
  })
})
