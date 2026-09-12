import type { SupabaseClient } from "@supabase/supabase-js"

import { createBookmarkAssetProcessor } from "../../../src/lib/bookmark-enrichment/bookmark-asset-processor.ts"
import {
  createEnrichmentHandler,
  type EnrichmentHandlerResult,
} from "../../../src/lib/bookmark-enrichment/enrichment-handler.ts"
import { ENRICHMENT_QUEUE_SETTINGS } from "../../../src/lib/bookmark-enrichment/enrichment-queue-settings.ts"
import { createDurableRetryPolicy } from "../../../src/lib/durable-worker/durable-worker-retry.ts"
import {
  DURABLE_QUEUE_NAMES,
  type DurableQueueName,
  type DurableWorkerSummary,
} from "../../../src/lib/durable-worker/durable-worker-types.ts"
import { runDurableWorker } from "../../../src/lib/durable-worker/durable-worker.ts"
import { createSupabaseDurableWorkerAdapter } from "../../../src/lib/durable-worker/supabase-durable-worker-adapter.ts"
import { createHostLimitedFetcher } from "../../../src/lib/network-safety/host-limited-fetch.ts"
import { createPinnedHttpFetcher } from "../../../src/lib/network-safety/pinned-http-fetch.ts"
import {
  createSsrfPolicy,
  type SsrfPolicyDependencies,
} from "../../../src/lib/network-safety/ssrf-policy.ts"
import type { Database } from "../../../src/types/database.generated.ts"
import { createPhotonImageRasterizer } from "./photon-image-rasterizer.ts"
import {
  createSupabaseBookmarkAssetRegistry,
  createSupabaseEnrichmentBatchAdapter,
  createSupabaseEnrichmentWorkSource,
  finishSupabaseEnrichmentClaim,
} from "./supabase-enrichment-adapter.ts"
import { createSupabasePrivateAssetStorage } from "./supabase-private-asset-storage.ts"

export interface EnrichmentQueueRunner {
  run(queueName: DurableQueueName): Promise<DurableWorkerSummary>
}

export const createEnrichmentQueueRunner = (
  client: SupabaseClient<Database>,
  network: SsrfPolicyDependencies
): EnrichmentQueueRunner => ({
  run: async (queueName) => {
    if (
      queueName !== DURABLE_QUEUE_NAMES.interactiveEnrichment &&
      queueName !== DURABLE_QUEUE_NAMES.bulkEnrichment
    ) {
      throw new Error("The queue has no enrichment handler.")
    }
    const settings = ENRICHMENT_QUEUE_SETTINGS[queueName]
    const ssrfPolicy = createSsrfPolicy(network)
    const fetcher = createHostLimitedFetcher(
      createPinnedHttpFetcher({
        requestTimeoutMs: settings.requestTimeoutMs,
        ssrfPolicy,
      }),
      settings.perHostConcurrency
    )
    const handler = createEnrichmentHandler({
      assets: createBookmarkAssetProcessor({
        rasterizer: createPhotonImageRasterizer(),
        registry: createSupabaseBookmarkAssetRegistry(client),
        storage: createSupabasePrivateAssetStorage(client),
      }),
      createAssetId: () => crypto.randomUUID(),
      fetcher,
      source: createSupabaseEnrichmentWorkSource(client),
    })
    const adapter = createSupabaseDurableWorkerAdapter<EnrichmentHandlerResult>(
      client,
      finishSupabaseEnrichmentClaim
    )
    return runDurableWorker(
      {
        batchSize: settings.batchSize,
        concurrency: settings.concurrency,
        heartbeatIntervalMs: settings.heartbeatIntervalMs,
        leaseSeconds: settings.leaseSeconds,
        queueName: settings.queueName,
        visibilitySeconds: settings.visibilitySeconds,
      },
      {
        adapter,
        batchAdapter: createSupabaseEnrichmentBatchAdapter(client),
        handler,
        retryPolicy: createDurableRetryPolicy({
          baseDelayMs: 5_000,
          jitterRatio: 0.2,
          maximumDelayMs: 300_000,
        }),
      }
    )
  },
})
