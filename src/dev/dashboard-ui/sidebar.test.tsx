import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"
import {
  DashboardSidebar,
  MobileDashboardNavigation,
} from "@/dev/dashboard-ui/sidebar"

afterEach(cleanup)

describe("DashboardSidebar", () => {
  it("disables hidden group triggers while collapsed", () => {
    const { container } = render(
      <SidebarProvider defaultOpen={false}>
        <DashboardSidebar />
      </SidebarProvider>
    )
    const collectionsTrigger = container.querySelector<HTMLButtonElement>(
      "button[aria-label='Collections']"
    )
    const tagsTrigger = container.querySelector<HTMLButtonElement>(
      "button[aria-label='Tags']"
    )

    expect(collectionsTrigger).not.toBeNull()
    expect(tagsTrigger).not.toBeNull()

    expect(collectionsTrigger?.getAttribute("aria-disabled")).toBe("true")
    expect(tagsTrigger?.getAttribute("aria-disabled")).toBe("true")
    expect(collectionsTrigger?.hasAttribute("inert")).toBe(true)
    expect(tagsTrigger?.hasAttribute("inert")).toBe(true)

    fireEvent.click(collectionsTrigger as HTMLButtonElement)
    fireEvent.click(tagsTrigger as HTMLButtonElement)

    expect(collectionsTrigger?.getAttribute("aria-expanded")).toBe("true")
    expect(tagsTrigger?.getAttribute("aria-expanded")).toBe("true")
  })

  it("keeps disclosure controls open and closes after leaf navigation", async () => {
    render(
      <SidebarProvider>
        <MobileDashboardNavigation />
      </SidebarProvider>
    )

    const navigationTrigger = screen.getByRole("button", {
      name: "Open navigation",
    })

    fireEvent.click(navigationTrigger)
    await screen.findByText("Navigation")

    fireEvent.click(screen.getByRole("button", { name: "Collections" }))
    expect(screen.getByText("Navigation")).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "All bookmarks" }))
    await waitFor(() => {
      expect(navigationTrigger.getAttribute("aria-expanded")).toBe("false")
    })
  })
})
