import { createServerFn } from "@tanstack/react-start"
import { getCookie, setCookie } from "@tanstack/react-start/server"

export type DashboardNavigationSection = "collections" | "tags"
export type DashboardNavigationSurface = "desktop" | "mobile"
export type DashboardNavigationDisclosures = Record<
  DashboardNavigationSection,
  boolean
>
export type DashboardNavigationPreferences = Record<
  DashboardNavigationSurface,
  DashboardNavigationDisclosures
>

type DashboardNavigationPreferenceUpdate = {
  open: boolean
  section: DashboardNavigationSection
  surface: DashboardNavigationSurface
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const cookieNames: Record<
  DashboardNavigationSurface,
  Record<DashboardNavigationSection, string>
> = {
  desktop: {
    collections: "reway_dashboard_desktop_collections",
    tags: "reway_dashboard_desktop_tags",
  },
  mobile: {
    collections: "reway_dashboard_mobile_collections",
    tags: "reway_dashboard_mobile_tags",
  },
}

export const defaultDashboardNavigationDisclosures: DashboardNavigationDisclosures =
  {
    collections: true,
    tags: true,
  }

function readDisclosureCookie(
  surface: DashboardNavigationSurface,
  section: DashboardNavigationSection
): boolean {
  const storedValue = getCookie(cookieNames[surface][section])

  if (storedValue === "0") return false
  if (storedValue === "1") return true
  return defaultDashboardNavigationDisclosures[section]
}

export const getDashboardNavigationPreferences = createServerFn({
  method: "GET",
}).handler((): DashboardNavigationPreferences => {
  return {
    desktop: {
      collections: readDisclosureCookie("desktop", "collections"),
      tags: readDisclosureCookie("desktop", "tags"),
    },
    mobile: {
      collections: readDisclosureCookie("mobile", "collections"),
      tags: readDisclosureCookie("mobile", "tags"),
    },
  }
})

export const setDashboardNavigationPreference = createServerFn({
  method: "POST",
})
  .validator(
    (
      input: DashboardNavigationPreferenceUpdate
    ): DashboardNavigationPreferenceUpdate => {
      if (
        (input.surface === "desktop" || input.surface === "mobile") &&
        (input.section === "collections" || input.section === "tags") &&
        typeof input.open === "boolean"
      ) {
        return input
      }

      throw new Error("Invalid dashboard navigation preference")
    }
  )
  .handler(({ data }): void => {
    setCookie(cookieNames[data.surface][data.section], data.open ? "1" : "0", {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    })
  })
