import { IDBFactory, IDBKeyRange } from "fake-indexeddb"
import { describe, expect, it } from "vitest"

import { normalizeHttpUrl } from "@/lib/network-safety/url-policy"
import { createIndexedDbQuickSaveOutbox } from "@/lib/quick-save-outbox/indexeddb-quick-save-outbox"
import type { QuickSaveOutbox } from "@/lib/quick-save-outbox/quick-save-outbox"

const SUBJECT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const SUBJECT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const OWNER_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const OWNER_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const REQUEST_A = "11111111-1111-4111-8111-111111111111"
const REQUEST_B = "22222222-2222-4222-8222-222222222222"
const LEASE_A = "33333333-3333-4333-8333-333333333333"
const LEASE_B = "44444444-4444-4444-8444-444444444444"

const requireUrl = (value: string) => {
  const result = normalizeHttpUrl(value)
  if (!result.ok) throw new TypeError("Expected a valid URL.")
  return result.value
}

const enqueue = (
  outbox: QuickSaveOutbox,
  clientRequestId: string = REQUEST_A,
  subjectId: string = SUBJECT_A
) =>
  outbox.mutate({
    clientRequestId,
    kind: "enqueue",
    subjectId,
    url: requireUrl("https://example.com"),
  })

const createIndexedDbHarness = (
  overrides: Parameters<typeof createIndexedDbQuickSaveOutbox>[0] = {}
) => {
  const indexedDb = new IDBFactory()
  const baseOptions = {
    databaseName: "test-outbox",
    indexedDb,
    keyRange: IDBKeyRange,
    ...overrides,
  }
  return {
    createAdapter: (
      adapterOverrides: Parameters<
        typeof createIndexedDbQuickSaveOutbox
      >[0] = {}
    ) =>
      createIndexedDbQuickSaveOutbox({ ...baseOptions, ...adapterOverrides }),
    indexedDb,
  }
}

describe("IndexedDB quick-save outbox", () => {
  it("recovers queued work through a new adapter after reload", async () => {
    const { createAdapter } = createIndexedDbHarness()
    await enqueue(createAdapter())

    const reloaded = createAdapter()
    await expect(
      reloaded.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toMatchObject([
      {
        clientRequestId: REQUEST_A,
        state: "queued_offline",
        url: "https://example.com/",
      },
    ])
  })

  it("lets only one tab claim the same entry", async () => {
    const { createAdapter } = createIndexedDbHarness({
      createLeaseToken: () => LEASE_A,
    })
    const firstTab = createAdapter()
    const secondTab = createAdapter({ createLeaseToken: () => LEASE_B })
    await enqueue(firstTab)

    const results = await Promise.all([
      firstTab.mutate({
        kind: "claim",
        ownerId: OWNER_A,
        subjectId: SUBJECT_A,
      }),
      secondTab.mutate({
        kind: "claim",
        ownerId: OWNER_B,
        subjectId: SUBJECT_A,
      }),
    ])
    const claimCounts = results.map((result) =>
      result.kind === "claimed" ? result.entries.length : -1
    )
    expect(claimCounts.sort((left, right) => left - right)).toEqual([0, 1])
  })

  it("recovers an expired lease and rejects the earlier token", async () => {
    let nowMs = 1_000
    const { createAdapter } = createIndexedDbHarness({
      createLeaseToken: () => LEASE_A,
      limits: { leaseMs: 100 },
      now: () => nowMs,
    })
    const firstTab = createAdapter()
    const secondTab = createAdapter({ createLeaseToken: () => LEASE_B })
    await enqueue(firstTab)
    const firstResult = await firstTab.mutate({
      kind: "claim",
      ownerId: OWNER_A,
      subjectId: SUBJECT_A,
    })
    if (firstResult.kind !== "claimed" || firstResult.entries.length !== 1) {
      throw new TypeError("Expected the first claim.")
    }

    nowMs += 101
    const secondResult = await secondTab.mutate({
      kind: "claim",
      ownerId: OWNER_B,
      subjectId: SUBJECT_A,
    })
    if (secondResult.kind !== "claimed" || secondResult.entries.length !== 1) {
      throw new TypeError("Expected the recovered claim.")
    }
    expect(secondResult.entries[0]).toMatchObject({
      attemptCount: 2,
      leaseToken: LEASE_B,
    })
    await expect(
      firstTab.mutate({
        clientRequestId: REQUEST_A,
        kind: "settle",
        leaseToken: LEASE_A,
        outcome: { status: "saved" },
        subjectId: SUBJECT_A,
      })
    ).rejects.toMatchObject({ code: "lease_lost" })
  })

  it("preserves uncertain reconciliation state across reload", async () => {
    let nowMs = 1_000
    const { createAdapter } = createIndexedDbHarness({
      createLeaseToken: () => LEASE_A,
      limits: { retryBaseMs: 100 },
      now: () => nowMs,
    })
    const outbox = createAdapter()
    await enqueue(outbox)
    const claim = await outbox.mutate({
      kind: "claim",
      ownerId: OWNER_A,
      subjectId: SUBJECT_A,
    })
    if (claim.kind !== "claimed" || claim.entries.length !== 1) {
      throw new TypeError("Expected one claim.")
    }
    const settlement = await outbox.mutate({
      clientRequestId: REQUEST_A,
      kind: "settle",
      leaseToken: claim.entries[0].leaseToken,
      outcome: { response: "uncertain", status: "retry" },
      subjectId: SUBJECT_A,
    })
    if (settlement.kind !== "settled")
      throw new TypeError("Expected settlement.")

    nowMs = settlement.entry.nextAttemptAtMs
    const reloaded = createAdapter({ createLeaseToken: () => LEASE_B })
    await expect(
      reloaded.mutate({
        kind: "claim",
        ownerId: OWNER_B,
        subjectId: SUBJECT_A,
      })
    ).resolves.toMatchObject({
      entries: [
        {
          clientRequestId: REQUEST_A,
          nextAction: "reconcile",
        },
      ],
    })
  })

  it("makes concurrent capacity checks atomic", async () => {
    const { createAdapter } = createIndexedDbHarness({
      limits: { maxEntries: 1 },
    })
    const firstTab = createAdapter()
    const secondTab = createAdapter()
    const results = await Promise.allSettled([
      enqueue(firstTab, REQUEST_A),
      enqueue(secondTab, REQUEST_B),
    ])

    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1)
    const rejection = results.find((result) => result.status === "rejected")
    expect(rejection).toMatchObject({
      reason: { code: "capacity_exceeded" },
      status: "rejected",
    })
    await expect(
      firstTab.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toHaveLength(1)
  })

  it("isolates account reads and clears only one subject", async () => {
    const { createAdapter } = createIndexedDbHarness()
    const outbox = createAdapter()
    await enqueue(outbox, REQUEST_A, SUBJECT_A)
    await enqueue(outbox, REQUEST_B, SUBJECT_B)

    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_B })
    ).resolves.toMatchObject([{ clientRequestId: REQUEST_B }])
    await outbox.mutate({ kind: "clear_subject", subjectId: SUBJECT_A })
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toEqual([])
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_B })
    ).resolves.toHaveLength(1)
  })

  it("keeps an entry after a permanent failure until explicit dismissal", async () => {
    const { createAdapter } = createIndexedDbHarness({
      createLeaseToken: () => LEASE_A,
    })
    const outbox = createAdapter()
    await enqueue(outbox)
    const claim = await outbox.mutate({
      kind: "claim",
      ownerId: OWNER_A,
      subjectId: SUBJECT_A,
    })
    if (claim.kind !== "claimed" || claim.entries.length !== 1) {
      throw new TypeError("Expected one claim.")
    }
    await outbox.mutate({
      clientRequestId: REQUEST_A,
      kind: "settle",
      leaseToken: claim.entries[0].leaseToken,
      outcome: { failureCode: "invalid_url", status: "permanent_failure" },
      subjectId: SUBJECT_A,
    })

    const reloaded = createAdapter()
    await expect(
      reloaded.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toMatchObject([{ state: "save_failed" }])
    await reloaded.mutate({
      clientRequestId: REQUEST_A,
      kind: "dismiss_failed",
      subjectId: SUBJECT_A,
    })
    await expect(
      reloaded.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toEqual([])
  })

  it("reports persistence denial while keeping the IndexedDB entry", async () => {
    let requests = 0
    const { createAdapter } = createIndexedDbHarness({
      persistence: {
        request: async () => {
          requests += 1
          return false
        },
      },
    })
    const outbox = createAdapter()
    await expect(enqueue(outbox, REQUEST_A)).resolves.toMatchObject({
      persistence: "best_effort",
    })
    await expect(enqueue(outbox, REQUEST_B)).resolves.toMatchObject({
      persistence: "best_effort",
    })
    expect(requests).toBe(1)
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toHaveLength(2)
  })

  it("maps an IndexedDB open failure without exposing the raw error", async () => {
    const indexedDb = {
      open: () => {
        throw new Error("private browser detail")
      },
    } as unknown as IDBFactory
    const outbox = createIndexedDbQuickSaveOutbox({
      indexedDb,
      keyRange: IDBKeyRange,
    })

    const error = await enqueue(outbox).catch((caught: unknown) => caught)
    expect(error).toMatchObject({
      code: "storage_unavailable",
      retrySafe: true,
    })
    expect((error as Error).message).not.toContain("private browser detail")
  })
})
