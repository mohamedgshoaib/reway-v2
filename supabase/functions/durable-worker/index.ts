import "@supabase/functions-js/edge-runtime.d.ts"
import { handleDurableWorkerWake } from "../_shared/durable-worker-wake.ts"

const enabledQueues = new Set<never>()

export default {
  fetch: (request: Request): Promise<Response> =>
    handleDurableWorkerWake(request, {
      enabledQueues,
      runQueue: async () => ({}),
      wakeToken: Deno.env.get("REWAY_WORKER_WAKE_TOKEN"),
    }),
}
