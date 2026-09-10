import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "../../../src/types/database.generated.ts"
import {
  createDenoDnsAdapter,
  createDenoPinnedConnectionAdapter,
  requireDenoPinningRuntime,
  type DenoNetworkRuntime,
} from "../_shared/deno-pinned-network.ts"
import {
  handleDurableWorkerWake,
  type EdgeWorkerQueueName,
} from "../_shared/durable-worker-wake.ts"
import { createEnrichmentQueueRunner } from "../_shared/enrichment-queue-runner.ts"

const runtime: DenoNetworkRuntime = requireDenoPinningRuntime(Deno)
const network = {
  connections: createDenoPinnedConnectionAdapter(runtime),
  dns: createDenoDnsAdapter(runtime),
}

const enabledQueues = new Set<EdgeWorkerQueueName>([
  "reway_enrichment_interactive",
  "reway_enrichment_bulk",
])

const runQueue = async (
  queueName: EdgeWorkerQueueName
): Promise<Record<string, number>> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseSecret =
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("The worker database client is not configured.")
  }
  const client = createClient<Database>(supabaseUrl, supabaseSecret, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
  const summary = await createEnrichmentQueueRunner(client, network).run(
    queueName
  )
  return { ...summary }
}

export default {
  fetch: (request: Request): Promise<Response> =>
    handleDurableWorkerWake(request, {
      enabledQueues,
      runQueue,
      wakeToken: Deno.env.get("REWAY_WORKER_WAKE_TOKEN"),
    }),
}
