import "@tanstack/react-start/server-only"

export interface SupabaseServerEnvironment {
  secretKey: string
}

type ServerEnvironmentSource = Readonly<
  Record<"SUPABASE_SECRET_KEY", string | undefined>
>

export const parseSupabaseServerEnvironment = (
  source: ServerEnvironmentSource
): SupabaseServerEnvironment => {
  const secretKey = source.SUPABASE_SECRET_KEY?.trim()

  if (!secretKey) {
    throw new Error("Missing environment variable: SUPABASE_SECRET_KEY.")
  }

  if (!secretKey.startsWith("sb_secret_")) {
    throw new Error("Invalid environment variable: SUPABASE_SECRET_KEY.")
  }

  return { secretKey }
}

export const getSupabaseServerEnvironment = (): SupabaseServerEnvironment =>
  parseSupabaseServerEnvironment({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  })
