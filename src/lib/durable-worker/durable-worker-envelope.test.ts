import { describe, expect, it } from "vitest"

import { parseDurableEnvelope } from "./durable-worker-envelope"
import { DURABLE_QUEUE_NAMES } from "./durable-worker-types"

describe("durable worker envelopes", () => {
  it("parses the bounded enrichment envelope", () => {
    expect(
      parseDurableEnvelope(
        {
          generation: "2",
          request_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          version: 1,
          work_kind: "enrichment",
        },
        DURABLE_QUEUE_NAMES.interactiveEnrichment
      )
    ).toEqual({
      envelope: {
        generation: "2",
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version: 1,
        workKind: "enrichment",
      },
      ok: true,
    })
  })

  it("rejects a work kind sent to the wrong queue", () => {
    expect(
      parseDurableEnvelope(
        {
          job_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          version: 1,
          work_kind: "export",
        },
        DURABLE_QUEUE_NAMES.mutatingTransfer
      )
    ).toEqual({ ok: false, reason: "unknown_work_kind" })
  })

  it("rejects unknown versions and oversized shapes", () => {
    expect(
      parseDurableEnvelope(
        { version: 2, work_kind: "enrichment" },
        DURABLE_QUEUE_NAMES.bulkEnrichment
      )
    ).toEqual({ ok: false, reason: "unsupported_payload_version" })
    expect(
      parseDurableEnvelope(
        { a: 1, b: 2, c: 3, d: 4, e: 5 },
        DURABLE_QUEUE_NAMES.bulkEnrichment
      )
    ).toEqual({ ok: false, reason: "malformed_envelope" })
  })

  it("rejects a generation outside the database bigint range", () => {
    expect(
      parseDurableEnvelope(
        {
          generation: "9223372036854775808",
          request_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          version: 1,
          work_kind: "enrichment",
        },
        DURABLE_QUEUE_NAMES.interactiveEnrichment
      )
    ).toEqual({ ok: false, reason: "invalid_identifier" })
  })
})
