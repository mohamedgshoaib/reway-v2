import {
  claimStoredEntries,
  createStoredEntry,
  outboxCapacityExceeded,
  outboxConflict,
  outboxNotFound,
  QuickSaveOutboxError,
  requireUuid,
  resolveQuickSaveOutboxOptions,
  settleStoredEntry,
  toPublicEntry,
  type EnqueueQuickSaveCommand,
  type QuickSaveOutbox,
  type QuickSaveOutboxCommand,
  type QuickSaveOutboxMutationResult,
  type QuickSaveOutboxOptions,
  type QuickSaveOutboxReadRequest,
  type StoredQuickSaveOutboxEntry,
} from "@/lib/quick-save-outbox/quick-save-outbox"

interface SubjectTotals {
  byteSize: number
  count: number
}

export interface InMemoryQuickSaveOutboxOptions extends QuickSaveOutboxOptions {
  readonly failWrites?: boolean
}

const requireWritable = (failWrites: boolean): void => {
  if (failWrites) {
    throw new QuickSaveOutboxError(
      "storage_unavailable",
      "This device could not preserve the quick save.",
      true
    )
  }
}

export const createInMemoryQuickSaveOutbox = (
  options: InMemoryQuickSaveOutboxOptions = {}
): QuickSaveOutbox => {
  const resolvedOptions = resolveQuickSaveOutboxOptions(options)
  const entriesBySubject = new Map<
    string,
    Map<string, StoredQuickSaveOutboxEntry>
  >()
  const totalsBySubject = new Map<string, SubjectTotals>()
  const failWrites = options.failWrites ?? false

  const getSubjectEntries = (
    subjectId: string
  ): Map<string, StoredQuickSaveOutboxEntry> =>
    entriesBySubject.get(subjectId) ?? new Map()

  const enqueue = async (
    command: EnqueueQuickSaveCommand
  ): Promise<QuickSaveOutboxMutationResult> => {
    requireWritable(failWrites)
    const entry = createStoredEntry(command, resolvedOptions)
    const subjectEntries = getSubjectEntries(command.subjectId)
    const existing = subjectEntries.get(command.clientRequestId)
    const persistence = await resolvedOptions.requestPersistence()
    if (existing !== undefined) {
      if (existing.url !== entry.url) throw outboxConflict()
      return {
        created: false,
        entry: toPublicEntry(existing),
        kind: "enqueued",
        persistence,
      }
    }

    const totals = totalsBySubject.get(command.subjectId) ?? {
      byteSize: 0,
      count: 0,
    }
    if (
      totals.count >= resolvedOptions.limits.maxEntries ||
      totals.byteSize + entry.byteSize > resolvedOptions.limits.maxBytes
    ) {
      throw outboxCapacityExceeded()
    }

    subjectEntries.set(command.clientRequestId, entry)
    entriesBySubject.set(command.subjectId, subjectEntries)
    totalsBySubject.set(command.subjectId, {
      byteSize: totals.byteSize + entry.byteSize,
      count: totals.count + 1,
    })
    return {
      created: true,
      entry: toPublicEntry(entry),
      kind: "enqueued",
      persistence,
    }
  }

  const claim = (
    command: Extract<QuickSaveOutboxCommand, { kind: "claim" }>
  ): QuickSaveOutboxMutationResult => {
    requireWritable(failWrites)
    requireUuid(command.ownerId, "ownerId")
    if (command.subjectId === null) return { entries: [], kind: "claimed" }

    const subjectEntries = getSubjectEntries(command.subjectId)
    const claimed = claimStoredEntries(
      [...subjectEntries.values()],
      command.subjectId,
      command.ownerId,
      resolvedOptions
    )
    for (const result of claimed) {
      subjectEntries.set(result.stored.clientRequestId, result.stored)
    }
    return { entries: claimed.map((result) => result.claimed), kind: "claimed" }
  }

  const settle = (
    command: Extract<QuickSaveOutboxCommand, { kind: "settle" }>
  ): QuickSaveOutboxMutationResult => {
    requireWritable(failWrites)
    requireUuid(command.subjectId, "subjectId")
    requireUuid(command.clientRequestId, "clientRequestId")
    requireUuid(command.leaseToken, "leaseToken")
    const subjectEntries = getSubjectEntries(command.subjectId)
    const existing = subjectEntries.get(command.clientRequestId)
    if (existing === undefined) throw outboxNotFound()

    const result = settleStoredEntry(existing, command, resolvedOptions)
    if (result.remove) {
      subjectEntries.delete(command.clientRequestId)
      const totals = totalsBySubject.get(command.subjectId)
      if (totals !== undefined) {
        totalsBySubject.set(command.subjectId, {
          byteSize: totals.byteSize - existing.byteSize,
          count: totals.count - 1,
        })
      }
    } else {
      subjectEntries.set(command.clientRequestId, result.stored)
    }
    return { entry: result.publicEntry, kind: "settled" }
  }

  const dismissFailed = (
    command: Extract<QuickSaveOutboxCommand, { kind: "dismiss_failed" }>
  ): QuickSaveOutboxMutationResult => {
    requireWritable(failWrites)
    requireUuid(command.subjectId, "subjectId")
    requireUuid(command.clientRequestId, "clientRequestId")
    const subjectEntries = getSubjectEntries(command.subjectId)
    const existing = subjectEntries.get(command.clientRequestId)
    if (existing === undefined) throw outboxNotFound()
    if (existing.state !== "save_failed") {
      throw new QuickSaveOutboxError(
        "conflict",
        "Only a failed quick save can be dismissed.",
        false
      )
    }
    subjectEntries.delete(command.clientRequestId)
    const totals = totalsBySubject.get(command.subjectId)
    if (totals !== undefined) {
      totalsBySubject.set(command.subjectId, {
        byteSize: totals.byteSize - existing.byteSize,
        count: totals.count - 1,
      })
    }
    return { kind: "dismissed" }
  }

  const clearSubject = (
    command: Extract<QuickSaveOutboxCommand, { kind: "clear_subject" }>
  ): QuickSaveOutboxMutationResult => {
    requireWritable(failWrites)
    requireUuid(command.subjectId, "subjectId")
    const count = getSubjectEntries(command.subjectId).size
    entriesBySubject.delete(command.subjectId)
    totalsBySubject.delete(command.subjectId)
    return { count, kind: "cleared" }
  }

  return {
    mutate: async (command) => {
      switch (command.kind) {
        case "enqueue":
          return enqueue(command)
        case "claim":
          return claim(command)
        case "settle":
          return settle(command)
        case "dismiss_failed":
          return dismissFailed(command)
        case "clear_subject":
          return clearSubject(command)
      }
    },
    read: async (request: QuickSaveOutboxReadRequest) => {
      if (request.subjectId === null) return []
      requireUuid(request.subjectId, "subjectId")
      return [...getSubjectEntries(request.subjectId).values()]
        .sort(
          (left, right) =>
            left.createdAtMs - right.createdAtMs ||
            left.clientRequestId.localeCompare(right.clientRequestId)
        )
        .map((entry) => toPublicEntry(entry))
    },
  }
}
