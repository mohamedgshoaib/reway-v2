import { beforeEach, describe, expect, it, vi } from "vitest"

interface ClaimsResult {
  data: {
    claims: {
      sub?: string
      user_metadata?: unknown
    } | null
  }
  error: Error | null
}

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn<() => Promise<ClaimsResult>>(),
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    handler: (handler: () => unknown) => handler,
  }),
}))

vi.mock("@/lib/supabase/server-client.server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getClaims: mocks.getClaims },
  }),
}))

import { getSupabaseAuthIdentity } from "@/lib/supabase/auth-identity.server"

describe("Supabase authentication identity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses the verified subject and ignores editable metadata", async () => {
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "user-123",
          user_metadata: { authorizationRole: "owner" },
        },
      },
      error: null,
    })

    await expect(getSupabaseAuthIdentity()).resolves.toEqual({
      userId: "user-123",
    })
    expect(mocks.getClaims).toHaveBeenCalledOnce()
  })

  it("returns no identity when claims cannot be verified", async () => {
    mocks.getClaims.mockResolvedValue({
      data: { claims: null },
      error: new Error("Invalid session"),
    })

    await expect(getSupabaseAuthIdentity()).resolves.toBeNull()
  })
})
