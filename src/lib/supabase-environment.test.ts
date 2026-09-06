import { describe, expect, it } from "vitest"

import {
  parseSupabasePublicEnvironment,
  type SupabasePublicEnvironment,
} from "@/lib/supabase-environment"
import { parseSupabaseServerEnvironment } from "@/lib/supabase-environment.server"

const validPublicEnvironment = {
  VITE_SITE_URL: "http://localhost:3000",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  VITE_SUPABASE_URL: "https://project.supabase.co",
}

describe("Supabase environment", () => {
  it("accepts the current public environment names", () => {
    expect(
      parseSupabasePublicEnvironment(validPublicEnvironment)
    ).toEqual<SupabasePublicEnvironment>({
      publishableKey: "sb_publishable_test",
      siteUrl: "http://localhost:3000",
      supabaseUrl: "https://project.supabase.co",
    })
  })

  it("accepts the verified legacy browser variable name as an alias", () => {
    expect(
      parseSupabasePublicEnvironment({
        VITE_SITE_URL: validPublicEnvironment.VITE_SITE_URL,
        VITE_SUPABASE_KEY: "sb_publishable_alias",
        VITE_SUPABASE_URL: validPublicEnvironment.VITE_SUPABASE_URL,
      }).publishableKey
    ).toBe("sb_publishable_alias")
  })

  it("reports missing names without environment values", () => {
    expect(() => parseSupabasePublicEnvironment({})).toThrowError(
      "Missing environment variable: VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_KEY."
    )
  })

  it("rejects unsafe public URLs and non-publishable browser keys", () => {
    expect(() =>
      parseSupabasePublicEnvironment({
        ...validPublicEnvironment,
        VITE_SUPABASE_URL: "http://project.supabase.co",
      })
    ).toThrowError("Invalid environment variable: VITE_SUPABASE_URL.")

    expect(() =>
      parseSupabasePublicEnvironment({
        ...validPublicEnvironment,
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
      })
    ).toThrowError(
      "Invalid environment variable: VITE_SUPABASE_PUBLISHABLE_KEY."
    )
  })

  it("keeps secret-key validation in the server-only module", () => {
    expect(
      parseSupabaseServerEnvironment({
        SUPABASE_SECRET_KEY: "sb_secret_test",
      })
    ).toEqual({ secretKey: "sb_secret_test" })

    expect(() =>
      parseSupabaseServerEnvironment({
        SUPABASE_SECRET_KEY: "sb_publishable_test",
      })
    ).toThrowError("Invalid environment variable: SUPABASE_SECRET_KEY.")
  })
})
