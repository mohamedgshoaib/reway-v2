import {
  DURABLE_QUEUE_NAMES,
  type DurableWorkerRequest,
} from "../durable-worker/durable-worker-types.ts"

export type EnrichmentQueueName =
  | typeof DURABLE_QUEUE_NAMES.bulkEnrichment
  | typeof DURABLE_QUEUE_NAMES.interactiveEnrichment

export interface EnrichmentQueueSettings extends DurableWorkerRequest {
  readonly perHostConcurrency: number
  readonly requestTimeoutMs: number
}

export const ENRICHMENT_QUEUE_SETTINGS: Readonly<
  Record<EnrichmentQueueName, EnrichmentQueueSettings>
> = {
  [DURABLE_QUEUE_NAMES.interactiveEnrichment]: {
    batchSize: 4,
    concurrency: 2,
    heartbeatIntervalMs: 20_000,
    leaseSeconds: 60,
    perHostConcurrency: 1,
    queueName: DURABLE_QUEUE_NAMES.interactiveEnrichment,
    requestTimeoutMs: 20_000,
    visibilitySeconds: 90,
  },
  [DURABLE_QUEUE_NAMES.bulkEnrichment]: {
    batchSize: 50,
    concurrency: 4,
    heartbeatIntervalMs: 20_000,
    leaseSeconds: 60,
    perHostConcurrency: 2,
    queueName: DURABLE_QUEUE_NAMES.bulkEnrichment,
    requestTimeoutMs: 20_000,
    visibilitySeconds: 90,
  },
}
