import { describe, expect, it } from "vitest"

import { DURABLE_QUEUE_NAMES } from "../durable-worker/durable-worker-types"
import { ENRICHMENT_QUEUE_SETTINGS } from "./enrichment-queue-settings"

describe("enrichment queue settings", () => {
  it("keeps interactive and bulk capacity independent and bounded", () => {
    const interactive =
      ENRICHMENT_QUEUE_SETTINGS[DURABLE_QUEUE_NAMES.interactiveEnrichment]
    const bulk = ENRICHMENT_QUEUE_SETTINGS[DURABLE_QUEUE_NAMES.bulkEnrichment]

    expect(interactive.queueName).toBe(
      DURABLE_QUEUE_NAMES.interactiveEnrichment
    )
    expect(bulk.queueName).toBe(DURABLE_QUEUE_NAMES.bulkEnrichment)
    expect(interactive).not.toBe(bulk)
    expect(interactive.batchSize).toBeLessThan(bulk.batchSize)
    expect(bulk.batchSize).toBe(50)
    expect(bulk.concurrency).toBe(6)
    expect(interactive.concurrency).toBeLessThan(bulk.concurrency)
    expect(interactive.perHostConcurrency).toBeLessThan(interactive.concurrency)
    expect(bulk.perHostConcurrency).toBe(2)
  })
})
