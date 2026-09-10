import { createClient } from "@supabase/supabase-js"

import {
  createNodeDnsAdapter,
  createNodePinnedConnectionAdapter,
} from "../src/lib/network-safety/node-pinned-network.server.ts"
import type { Database } from "../src/types/database.generated.ts"
import type { EdgeWorkerQueueName } from "../supabase/functions/_shared/durable-worker-wake.ts"
import { handleDurableWorkerWake } from "../supabase/functions/_shared/durable-worker-wake.ts"
import {
  createEnrichmentQueueRunner,
  type EnrichmentQueueRunner,
} from "../supabase/functions/_shared/enrichment-queue-runner.ts"

const enabledQueues = new Set<EdgeWorkerQueueName>([
  "reway_enrichment_interactive",
  "reway_enrichment_bulk",
])

let queueRunner: EnrichmentQueueRunner | undefined

const requireEnvironment = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`The ${name} environment value is missing.`)
  return value
}

const requireSupabaseUrl = (): string => {
  const value = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  if (!value) throw new Error("The Supabase URL environment value is missing.")
  return value
}

const getQueueRunner = (): EnrichmentQueueRunner => {
  if (queueRunner) return queueRunner

  const client = createClient<Database>(
    requireSupabaseUrl(),
    requireEnvironment("SUPABASE_SECRET_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )
  queueRunner = createEnrichmentQueueRunner(client, {
    connections: createNodePinnedConnectionAdapter(),
    dns: createNodeDnsAdapter(),
  })
  return queueRunner
}

const runQueue = async (
  queueName: EdgeWorkerQueueName
): Promise<Record<string, number>> => ({
  ...(await getQueueRunner().run(queueName)),
})

export default {
  fetch: (request: Request): Promise<Response> =>
    handleDurableWorkerWake(request, {
      enabledQueues,
      runQueue,
      wakeToken: process.env.REWAY_WORKER_WAKE_TOKEN,
    }),
}
