import { describe, expect, it } from "vitest"

import { normalizeHttpUrl } from "@/lib/network-safety/url-policy"
import { createInMemoryQuickSaveOutbox } from "@/lib/quick-save-outbox/in-memory-quick-save-outbox"
import type {
  ClaimedQuickSave,
  QuickSaveOutbox,
} from "@/lib/quick-save-outbox/quick-save-outbox"

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
  subjectId: string = SUBJECT_A,
  url: string = "https://example.com"
) =>
  outbox.mutate({
    clientRequestId,
    kind: "enqueue",
    subjectId,
    url: requireUrl(url),
  })

const claimOne = async (
  outbox: QuickSaveOutbox,
  ownerId: string = OWNER_A,
  subjectId: string | null = SUBJECT_A
): Promise<ClaimedQuickSave> => {
  const result = await outbox.mutate({ kind: "claim", ownerId, subjectId })
  if (result.kind !== "claimed" || result.entries.length !== 1) {
    throw new TypeError("Expected one outbox claim.")
  }
  return result.entries[0]
}

describe("in-memory quick-save outbox", () => {
  it("enqueues a normalized URL and requests persistent storage once", async () => {
    let persistenceRequests = 0
    const outbox = createInMemoryQuickSaveOutbox({
      persistence: {
        request: async () => {
          persistenceRequests += 1
          return true
        },
      },
    })

    const first = await enqueue(outbox, REQUEST_A)
    const second = await enqueue(outbox, REQUEST_B)

    expect(first).toMatchObject({
      created: true,
      entry: {
        clientRequestId: REQUEST_A,
        nextAction: "create",
        state: "queued_offline",
        url: "https://example.com/",
      },
      kind: "enqueued",
      persistence: "persistent",
    })
    expect(second).toMatchObject({ persistence: "persistent" })
    expect(persistenceRequests).toBe(1)
  })

  it("keeps an enqueue idempotent and rejects request-ID reuse for another URL", async () => {
    const outbox = createInMemoryQuickSaveOutbox()
    await expect(enqueue(outbox)).resolves.toMatchObject({ created: true })
    await expect(enqueue(outbox)).resolves.toMatchObject({ created: false })
    await expect(
      enqueue(outbox, REQUEST_A, SUBJECT_A, "https://example.org")
    ).rejects.toMatchObject({ code: "conflict", retrySafe: false })
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toHaveLength(1)
  })

  it("pauses without a session and isolates another account", async () => {
    const outbox = createInMemoryQuickSaveOutbox()
    await enqueue(outbox)

    await expect(
      outbox.read({ kind: "entries", subjectId: null })
    ).resolves.toEqual([])
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_B })
    ).resolves.toEqual([])
    await expect(
      outbox.mutate({ kind: "claim", ownerId: OWNER_A, subjectId: null })
    ).resolves.toEqual({ entries: [], kind: "claimed" })
    await expect(
      outbox.mutate({
        clientRequestId: REQUEST_A,
        kind: "dismiss_failed",
        subjectId: SUBJECT_B,
      })
    ).rejects.toMatchObject({ code: "not_found" })
  })

  it("keeps one stable request ID and switches uncertain work to reconciliation", async () => {
    let nowMs = 1_000
    const outbox = createInMemoryQuickSaveOutbox({
      createLeaseToken: () => LEASE_A,
      limits: { retryBaseMs: 100 },
      now: () => nowMs,
    })
    await enqueue(outbox)
    const firstClaim = await claimOne(outbox)
    const released = await outbox.mutate({
      clientRequestId: REQUEST_A,
      kind: "settle",
      leaseToken: firstClaim.leaseToken,
      outcome: { response: "uncertain", status: "retry" },
      subjectId: SUBJECT_A,
    })
    if (released.kind !== "settled") throw new TypeError("Expected settlement.")
    expect(released.entry).toMatchObject({
      clientRequestId: REQUEST_A,
      nextAction: "reconcile",
      state: "queued_offline",
    })

    nowMs = released.entry.nextAttemptAtMs
    const secondClaim = await claimOne(outbox)
    expect(secondClaim).toMatchObject({
      attemptCount: 2,
      clientRequestId: REQUEST_A,
      nextAction: "reconcile",
    })
  })

  it("reclaims an expired lease and rejects the stale tab", async () => {
    let nowMs = 10_000
    const leaseTokens = [LEASE_A, LEASE_B]
    const outbox = createInMemoryQuickSaveOutbox({
      createLeaseToken: () => leaseTokens.shift() ?? LEASE_B,
      limits: { leaseMs: 1_000 },
      now: () => nowMs,
    })
    await enqueue(outbox)
    const staleClaim = await claimOne(outbox, OWNER_A)
    nowMs += 1_001
    const recoveredClaim = await claimOne(outbox, OWNER_B)

    expect(recoveredClaim.leaseToken).toBe(LEASE_B)
    expect(recoveredClaim.attemptCount).toBe(2)
    await expect(
      outbox.mutate({
        clientRequestId: REQUEST_A,
        kind: "settle",
        leaseToken: staleClaim.leaseToken,
        outcome: { status: "saved" },
        subjectId: SUBJECT_A,
      })
    ).rejects.toMatchObject({ code: "lease_lost", retrySafe: true })
  })

  it("removes confirmed saves and preserves permanent failures until dismissal", async () => {
    const leaseTokens = [LEASE_A, LEASE_B]
    const outbox = createInMemoryQuickSaveOutbox({
      createLeaseToken: () => leaseTokens.shift() ?? LEASE_B,
    })
    await enqueue(outbox, REQUEST_A)
    await enqueue(outbox, REQUEST_B)
    const claimed = await outbox.mutate({
      kind: "claim",
      ownerId: OWNER_A,
      subjectId: SUBJECT_A,
    })
    if (claimed.kind !== "claimed") throw new TypeError("Expected claims.")
    const first = claimed.entries.find(
      (entry) => entry.clientRequestId === REQUEST_A
    )
    const second = claimed.entries.find(
      (entry) => entry.clientRequestId === REQUEST_B
    )
    if (first === undefined || second === undefined) {
      throw new TypeError("Expected both claims.")
    }

    await expect(
      outbox.mutate({
        clientRequestId: REQUEST_A,
        kind: "settle",
        leaseToken: first.leaseToken,
        outcome: { status: "saved" },
        subjectId: SUBJECT_A,
      })
    ).resolves.toMatchObject({ entry: { state: "saved" } })
    await outbox.mutate({
      clientRequestId: REQUEST_B,
      kind: "settle",
      leaseToken: second.leaseToken,
      outcome: {
        failureCode: "unsafe_destination",
        status: "permanent_failure",
      },
      subjectId: SUBJECT_A,
    })

    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toMatchObject([
      { clientRequestId: REQUEST_B, state: "save_failed" },
    ])
    await outbox.mutate({
      clientRequestId: REQUEST_B,
      kind: "dismiss_failed",
      subjectId: SUBJECT_A,
    })
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toEqual([])
  })

  it("rejects a new write at the item cap without deleting the older save", async () => {
    const outbox = createInMemoryQuickSaveOutbox({
      limits: { maxEntries: 1 },
    })
    await enqueue(outbox, REQUEST_A)
    await expect(enqueue(outbox, REQUEST_B)).rejects.toMatchObject({
      code: "capacity_exceeded",
      retrySafe: false,
    })
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toMatchObject([{ clientRequestId: REQUEST_A }])
  })

  it("rejects a new write at the byte cap without deleting the older save", async () => {
    const outbox = createInMemoryQuickSaveOutbox({
      limits: { maxBytes: 900 },
    })
    await enqueue(outbox, REQUEST_A)
    await expect(enqueue(outbox, REQUEST_B)).rejects.toMatchObject({
      code: "capacity_exceeded",
    })
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_A })
    ).resolves.toMatchObject([{ clientRequestId: REQUEST_A }])
  })

  it("clears only the confirmed deleted account", async () => {
    const outbox = createInMemoryQuickSaveOutbox()
    await enqueue(outbox, REQUEST_A, SUBJECT_A)
    await enqueue(outbox, REQUEST_B, SUBJECT_B)

    await expect(
      outbox.mutate({ kind: "clear_subject", subjectId: SUBJECT_A })
    ).resolves.toEqual({ count: 1, kind: "cleared" })
    await expect(
      outbox.read({ kind: "entries", subjectId: SUBJECT_B })
    ).resolves.toMatchObject([{ clientRequestId: REQUEST_B }])
  })

  it("reports a local storage failure without claiming durability", async () => {
    const outbox = createInMemoryQuickSaveOutbox({ failWrites: true })

    await expect(enqueue(outbox)).rejects.toMatchObject({
      code: "storage_unavailable",
      retrySafe: true,
    })
  })
})
