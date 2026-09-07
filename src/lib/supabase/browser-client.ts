import { createBrowserClient } from "@supabase/ssr"

import { getSupabasePublicEnvironment } from "@/lib/supabase-environment"
import type { Database } from "@/types/database.generated"

export const createSupabaseBrowserClient = () => {
  const { publishableKey, supabaseUrl } = getSupabasePublicEnvironment()

  return createBrowserClient<Database>(supabaseUrl, publishableKey)
}
