import { beforeEach, describe, expect, it, vi } from "vitest"

interface PublicEnvironment {
  publishableKey: string
  siteUrl: string
  supabaseUrl: string
}

interface ServerEnvironment {
  secretKey: string
}

interface WorkerClientOptions {
  auth: {
    autoRefreshToken: boolean
    detectSessionInUrl: boolean
    persistSession: boolean
  }
}

const mocks = vi.hoisted(() => ({
  createClient:
    vi.fn<
      (url: string, key: string, options: WorkerClientOptions) => unknown
    >(),
  getPublicEnvironment: vi.fn<() => PublicEnvironment>(),
  getServerEnvironment: vi.fn<() => ServerEnvironment>(),
  workerClient: { kind: "worker" },
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}))

vi.mock("@/lib/supabase-environment", () => ({
  getSupabasePublicEnvironment: mocks.getPublicEnvironment,
}))

vi.mock("@/lib/supabase-environment.server", () => ({
  getSupabaseServerEnvironment: mocks.getServerEnvironment,
}))

import { createSupabaseWorkerClient } from "@/lib/supabase/worker-client.server"

describe("Supabase worker client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockReturnValue(mocks.workerClient)
    mocks.getPublicEnvironment.mockReturnValue({
      publishableKey: "sb_publishable_test",
      siteUrl: "http://localhost:3000",
      supabaseUrl: "https://project.supabase.co",
    })
    mocks.getServerEnvironment.mockReturnValue({
      secretKey: "sb_secret_test",
    })
  })

  it("keeps privileged access stateless and server-only", () => {
    const client = createSupabaseWorkerClient()

    expect(client).toBe(mocks.workerClient)
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "sb_secret_test",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    )
  })
})
