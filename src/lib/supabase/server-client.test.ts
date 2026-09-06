import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr"
import { beforeEach, describe, expect, it, vi } from "vitest"

interface PublicEnvironment {
  publishableKey: string
  siteUrl: string
  supabaseUrl: string
}

interface ServerClientOptions {
  cookies: CookieMethodsServer
}

const mocks = vi.hoisted(() => {
  const serverClient = { kind: "server" }

  return {
    createServerClient: vi.fn<
      (
        url: string,
        key: string,
        options: ServerClientOptions
      ) => typeof serverClient
    >(() => serverClient),
    getCookies: vi.fn<() => Record<string, string>>(),
    getPublicEnvironment: vi.fn<() => PublicEnvironment>(),
    responseHeaders: new Headers(),
    serverClient,
    setCookie:
      vi.fn<(name: string, value: string, options?: CookieOptions) => void>(),
  }
})

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}))

vi.mock("@tanstack/react-start/server", () => ({
  getCookies: mocks.getCookies,
  getResponseHeaders: () => mocks.responseHeaders,
  setCookie: mocks.setCookie,
}))

vi.mock("@/lib/supabase-environment", () => ({
  getSupabasePublicEnvironment: mocks.getPublicEnvironment,
}))

import { createSupabaseServerClient } from "@/lib/supabase/server-client.server"

describe("Supabase request-scoped server client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.responseHeaders.delete("cache-control")
    mocks.responseHeaders.delete("expires")
    mocks.responseHeaders.delete("pragma")
    mocks.getCookies.mockReturnValue({
      "sb-project-auth-token": "session-value",
      theme: "dark",
    })
    mocks.getPublicEnvironment.mockReturnValue({
      publishableKey: "sb_publishable_test",
      siteUrl: "http://localhost:3000",
      supabaseUrl: "https://project.supabase.co",
    })
  })

  it("creates a new publishable-key client for each request", () => {
    const firstClient = createSupabaseServerClient()
    const secondClient = createSupabaseServerClient()

    expect(firstClient).toBe(mocks.serverClient)
    expect(secondClient).toBe(mocks.serverClient)
    expect(mocks.createServerClient).toHaveBeenCalledTimes(2)
    expect(mocks.createServerClient).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co",
      "sb_publishable_test",
      expect.any(Object)
    )
  })

  it("adapts request cookies and response headers", async () => {
    createSupabaseServerClient()
    const options = mocks.createServerClient.mock.calls[0]?.[2]

    expect(options?.cookies.getAll()).toEqual([
      { name: "sb-project-auth-token", value: "session-value" },
      { name: "theme", value: "dark" },
    ])

    const setAll = options?.cookies.setAll

    if (!setAll) {
      throw new Error("Expected the server cookie adapter to support writes.")
    }

    await setAll(
      [
        {
          name: "sb-project-auth-token",
          options: { httpOnly: true, path: "/", sameSite: "lax" },
          value: "refreshed-session",
        },
      ],
      {
        "Cache-Control": "private, no-store",
        Expires: "0",
        Pragma: "no-cache",
      }
    )

    expect(mocks.setCookie).toHaveBeenCalledWith(
      "sb-project-auth-token",
      "refreshed-session",
      { httpOnly: true, path: "/", sameSite: "lax" }
    )
    expect(mocks.responseHeaders.get("cache-control")).toBe("private, no-store")
    expect(mocks.responseHeaders.get("expires")).toBe("0")
    expect(mocks.responseHeaders.get("pragma")).toBe("no-cache")
  })
})
