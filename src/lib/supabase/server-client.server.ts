import "@tanstack/react-start/server-only"
import { createServerClient } from "@supabase/ssr"
import {
  getCookies,
  getResponseHeaders,
  setCookie,
} from "@tanstack/react-start/server"

import { getSupabasePublicEnvironment } from "@/lib/supabase-environment"

export const createSupabaseServerClient = () => {
  const { publishableKey, supabaseUrl } = getSupabasePublicEnvironment()

  return createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () =>
        Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet, headers) => {
        for (const { name, options, value } of cookiesToSet) {
          setCookie(name, value, options)
        }

        const responseHeaders = getResponseHeaders()

        for (const [name, value] of Object.entries(headers)) {
          responseHeaders.set(name, value)
        }
      },
    },
  })
}
