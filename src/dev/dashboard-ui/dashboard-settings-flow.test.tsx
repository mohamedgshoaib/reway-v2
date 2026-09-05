import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DashboardAccountMutationAdapter } from "@/dev/dashboard-ui/dashboard-account"
import { DashboardUiPage } from "@/dev/dashboard-ui/page"

const navigationPreferences = {
  desktop: { collections: true, tags: true },
  mobile: { collections: true, tags: true },
}

function deferred(): {
  promise: Promise<void>
  resolve: () => void
} {
  let resolvePromise: (() => void) | undefined
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: () => resolvePromise?.() }
}

function renderPage(
  accountMutationAdapter: DashboardAccountMutationAdapter = async () =>
    undefined
): void {
  render(
    <DashboardUiPage
      accountMutationAdapter={accountMutationAdapter}
      initialNavigationPreferences={navigationPreferences}
    />
  )
}

function openSettings(): HTMLButtonElement {
  const trigger = screen.getByRole<HTMLButtonElement>("button", {
    name: "Settings",
  })
  fireEvent.click(trigger)
  return trigger
}

function openSettingsPage(name: "Profile" | "Account" | "Demo"): void {
  let navigation = screen.queryByRole("navigation", {
    name: "Settings pages",
  })
  if (!navigation) {
    const settingsDialog = screen.getByRole("dialog")
    fireEvent.click(
      within(settingsDialog).getByRole("button", { name: "Settings" })
    )
    navigation = screen.getByRole("navigation", { name: "Settings pages" })
  }
  fireEvent.click(within(navigation).getByRole("button", { name }))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("dashboard settings flow", () => {
  it("opens over the library, keeps its destination, and returns focus", async () => {
    renderPage()
    expect(screen.getByRole("heading", { name: "Research" })).not.toBeNull()

    const trigger = openSettings()
    expect(screen.getByRole("heading", { name: "Settings" })).not.toBeNull()
    expect(
      screen.getByRole("navigation", { name: "Settings pages" })
    ).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull()
    })
    expect(screen.getByRole("heading", { name: "Research" })).not.toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it("uses page navigation on desktop and mobile without tab semantics", async () => {
    const matchMedia = vi.spyOn(window, "matchMedia")
    matchMedia.mockImplementation((query) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }))
    renderPage()
    openSettings()
    const desktopNavigation = screen.getByRole("navigation", {
      name: "Settings pages",
    })
    expect(
      within(desktopNavigation)
        .getByRole("button", { name: "Profile" })
        .getAttribute("aria-current")
    ).toBe("page")
    expect(screen.queryByRole("tablist")).toBeNull()
    fireEvent.click(
      within(desktopNavigation).getByRole("button", { name: "Account" })
    )
    expect(screen.getByRole("heading", { name: "Account" })).not.toBeNull()
    expect(
      within(desktopNavigation)
        .getByRole("button", { name: "Account" })
        .getAttribute("aria-current")
    ).toBe("page")

    cleanup()
    matchMedia.mockImplementation((query) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches:
        query.includes("prefers-reduced-motion") ||
        query.includes("max-width: 799px"),
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }))
    renderPage()
    openSettings()
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Settings pages",
    })
    expect(screen.queryByRole("tablist")).toBeNull()
    fireEvent.click(
      within(mobileNavigation).getByRole("button", { name: "Profile" })
    )
    expect(
      screen.queryByRole("navigation", { name: "Settings pages" })
    ).toBeNull()
    expect(screen.getByRole("heading", { name: "Profile" })).not.toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("region", { name: "Profile" })
      )
    )
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Settings",
      })
    )
    const restoredNavigation = screen.getByRole("navigation", {
      name: "Settings pages",
    })
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(restoredNavigation).getByRole("button", { name: "Profile" })
      )
    )
  })

  it("opens above the mobile drawer without closing its navigation context", async () => {
    renderPage()
    const navigationTrigger = screen.getByRole("button", {
      name: "Open navigation",
    })
    fireEvent.click(navigationTrigger)
    const navigationTitle = await screen.findByRole("heading", {
      name: "Navigation",
    })
    const drawer = navigationTitle.closest<HTMLElement>(
      "[data-slot=drawer-popup]"
    )
    if (!drawer) throw new Error("Mobile navigation drawer did not render.")

    fireEvent.click(within(drawer).getByRole("button", { name: "Settings" }))
    expect(screen.getByRole("heading", { name: "Settings" })).not.toBeNull()
    expect(navigationTrigger.getAttribute("aria-expanded")).toBe("true")
  })

  it("rejects invalid images before preview and restores a Google avatar", async () => {
    renderPage()
    openSettings()
    openSettingsPage("Demo")
    fireEvent.click(screen.getByRole("radio", { name: /Google defaults/ }))
    openSettingsPage("Profile")

    expect(screen.getByText("Google avatar")).not.toBeNull()
    const fileInput = screen.getByLabelText("Upload an avatar")
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["gif"], "avatar.gif", { type: "image/gif" })],
      },
    })
    expect(
      screen.getByText("Choose a JPEG, PNG, or WebP image.")
    ).not.toBeNull()
    expect(screen.getByText("Google avatar")).not.toBeNull()

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["png"], "avatar.png", { type: "image/png" })],
      },
    })
    expect(await screen.findByText("Uploaded avatar")).not.toBeNull()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove upload and restore Google avatar",
      })
    )
    expect(screen.getByText("Google avatar")).not.toBeNull()
  })

  it("preserves a failed profile draft and succeeds on Retry", async () => {
    const mutationAdapter = vi
      .fn<DashboardAccountMutationAdapter>()
      .mockRejectedValueOnce(new Error("fixture failure"))
      .mockResolvedValueOnce(undefined)
    renderPage(mutationAdapter)
    openSettings()
    openSettingsPage("Profile")
    const username = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Username",
    })
    fireEvent.change(username, { target: { value: "ميرا" } })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Profile not saved")).not.toBeNull()
    expect(username.value).toBe("ميرا")
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(await screen.findByText("Profile saved")).not.toBeNull()
    expect(mutationAdapter).toHaveBeenCalledTimes(2)
  })

  it("protects a dirty Settings draft before closing", async () => {
    renderPage()
    const trigger = openSettings()
    openSettingsPage("Profile")
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "Changed profile" },
    })

    fireEvent.pointerDown(document.body)
    expect(screen.getByRole("heading", { name: "Settings" })).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(
      screen.getByRole("heading", { name: "Save profile changes?" })
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Discard and close" }))

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull()
    })
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it("protects a dirty profile draft before Reset demo", () => {
    renderPage()
    openSettings()
    openSettingsPage("Profile")
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "Changed profile" },
    })

    openSettingsPage("Demo")
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }))
    expect(
      screen.getByRole("heading", { name: "Replace profile changes?" })
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }))

    openSettingsPage("Profile")
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Username" }).value
    ).toBe("Changed profile")
  })

  it("confirms before an edited onboarding draft uses defaults", async () => {
    renderPage()
    openSettings()
    openSettingsPage("Demo")
    fireEvent.click(
      screen.getByRole("button", { name: "Preview profile setup" })
    )
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "Draft profile" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }))

    expect(
      screen.getByRole("heading", { name: "Use the default profile?" })
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Use defaults" }))
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Set up your profile" })
      ).toBeNull()
    })
    openSettingsPage("Profile")
    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Username" }).value
    ).toBe("mira.hassan")
  })

  it("blocks dismissal while account deletion is pending", async () => {
    const deletion = deferred()
    renderPage((mutation) =>
      mutation.kind === "delete-account" ? deletion.promise : Promise.resolve()
    )
    openSettings()
    openSettingsPage("Account")
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    const confirmation = screen.getByRole("textbox", { name: "Confirmation" })
    fireEvent.change(confirmation, { target: { value: "Delete" } })
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Delete account" })
        .disabled
    ).toBe(true)
    fireEvent.change(confirmation, { target: { value: "delete" } })
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    fireEvent.keyDown(document, { key: "Escape" })
    expect(
      screen.getByRole("heading", { name: "Type delete to continue" })
    ).not.toBeNull()

    await act(async () => deletion.resolve())
    expect(await screen.findByText("Deletion demo complete")).not.toBeNull()
    expect(
      screen.getByText(
        "Demo complete. No account was deleted and this session is still active."
      )
    ).not.toBeNull()
  })

  it("keeps a failed deletion confirmation ready for Retry", async () => {
    const mutationAdapter = vi
      .fn<DashboardAccountMutationAdapter>()
      .mockRejectedValueOnce(new Error("fixture failure"))
      .mockResolvedValueOnce(undefined)
    renderPage(mutationAdapter)
    openSettings()
    openSettingsPage("Account")
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    const confirmation = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Confirmation",
    })
    fireEvent.change(confirmation, { target: { value: "delete" } })
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))

    expect(
      await screen.findByText(
        "Could not delete the account. Check the confirmation and try again."
      )
    ).not.toBeNull()
    expect(confirmation.value).toBe("delete")
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    expect(await screen.findByText("Deletion demo complete")).not.toBeNull()
    expect(mutationAdapter).toHaveBeenCalledTimes(2)
  })
})
