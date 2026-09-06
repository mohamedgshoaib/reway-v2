import "@tanstack/react-start/server-only"
import { createServerFn } from "@tanstack/react-start"

import { createSupabaseServerClient } from "@/lib/supabase/server-client.server"

export interface SupabaseAuthIdentity {
  userId: string
}

export const getSupabaseAuthIdentity = createServerFn({
  method: "GET",
}).handler(async (): Promise<SupabaseAuthIdentity | null> => {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (error || typeof userId !== "string" || !userId) {
    return null
  }

  return { userId }
})
