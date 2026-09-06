import "@tanstack/react-start/server-only"
import { createClient } from "@supabase/supabase-js"

import { getSupabasePublicEnvironment } from "@/lib/supabase-environment"
import { getSupabaseServerEnvironment } from "@/lib/supabase-environment.server"

export const createSupabaseWorkerClient = () => {
  const { supabaseUrl } = getSupabasePublicEnvironment()
  const { secretKey } = getSupabaseServerEnvironment()

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
