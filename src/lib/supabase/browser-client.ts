import { createBrowserClient } from "@supabase/ssr"

import { getSupabasePublicEnvironment } from "@/lib/supabase-environment"

export const createSupabaseBrowserClient = () => {
  const { publishableKey, supabaseUrl } = getSupabasePublicEnvironment()

  return createBrowserClient(supabaseUrl, publishableKey)
}
