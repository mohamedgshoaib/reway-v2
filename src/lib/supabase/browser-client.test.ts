import { beforeEach, describe, expect, it, vi } from "vitest"

interface PublicEnvironment {
  publishableKey: string
  siteUrl: string
  supabaseUrl: string
}

const mocks = vi.hoisted(() => ({
  browserClient: { kind: "browser" },
  createBrowserClient: vi.fn<(url: string, key: string) => unknown>(),
  getPublicEnvironment: vi.fn<() => PublicEnvironment>(),
}))

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mocks.createBrowserClient,
}))

vi.mock("@/lib/supabase-environment", () => ({
  getSupabasePublicEnvironment: mocks.getPublicEnvironment,
}))

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client"

describe("Supabase browser client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createBrowserClient.mockReturnValue(mocks.browserClient)
    mocks.getPublicEnvironment.mockReturnValue({
      publishableKey: "sb_publishable_test",
      siteUrl: "http://localhost:3000",
      supabaseUrl: "https://project.supabase.co",
    })
  })

  it("uses only the public project environment", () => {
    const client = createSupabaseBrowserClient()

    expect(client).toBe(mocks.browserClient)
    expect(mocks.createBrowserClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "sb_publishable_test"
    )
  })
})
