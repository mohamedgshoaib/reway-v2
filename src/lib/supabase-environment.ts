type EnvironmentSource = Readonly<Record<string, string | undefined>>

const HTTP_PROTOCOLS = new Set(["http:", "https:"])
const HTTPS_PROTOCOLS = new Set(["https:"])

export interface SupabasePublicEnvironment {
  publishableKey: string
  siteUrl: string
  supabaseUrl: string
}

const requireValue = (source: EnvironmentSource, name: string): string => {
  const value = source[name]?.trim()

  if (!value) {
    throw new Error(`Missing environment variable: ${name}.`)
  }

  return value
}

const requireUrl = (
  source: EnvironmentSource,
  name: string,
  protocols: ReadonlySet<string>
): string => {
  const value = requireValue(source, name)
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error(`Invalid environment variable: ${name}.`)
  }

  if (!protocols.has(url.protocol) || url.username || url.password) {
    throw new Error(`Invalid environment variable: ${name}.`)
  }

  return value
}

const requirePublishableKey = (source: EnvironmentSource): string => {
  const currentName = "VITE_SUPABASE_PUBLISHABLE_KEY"
  const aliasName = "VITE_SUPABASE_KEY"
  const key = source[currentName]?.trim() ?? source[aliasName]?.trim()

  if (!key) {
    throw new Error(
      `Missing environment variable: ${currentName} or ${aliasName}.`
    )
  }

  if (!key.startsWith("sb_publishable_")) {
    const name = source[currentName]?.trim() ? currentName : aliasName
    throw new Error(`Invalid environment variable: ${name}.`)
  }

  return key
}

export const parseSupabasePublicEnvironment = (
  source: EnvironmentSource
): SupabasePublicEnvironment => ({
  publishableKey: requirePublishableKey(source),
  siteUrl: requireUrl(source, "VITE_SITE_URL", HTTP_PROTOCOLS),
  supabaseUrl: requireUrl(source, "VITE_SUPABASE_URL", HTTPS_PROTOCOLS),
})

export const getSupabasePublicEnvironment = (): SupabasePublicEnvironment =>
  parseSupabasePublicEnvironment({
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
    VITE_SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  })
