import {
  claimStoredEntries,
  createStoredEntry,
  MAX_OUTBOX_ENTRIES,
  outboxCapacityExceeded,
  outboxConflict,
  outboxNotFound,
  outboxStorageUnavailable,
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

const DEFAULT_DATABASE_NAME = "reway-quick-save-outbox"
const DATABASE_VERSION = 1
const ENTRY_STORE = "entries"
const SUBJECT_STORE = "subjects"
const SUBJECT_INDEX = "by_subject"
const READY_INDEX = "by_subject_state_ready"

interface StoredSubjectTotals {
  byteSize: number
  count: number
  subjectId: string
}

export interface IndexedDbQuickSaveOutboxOptions extends QuickSaveOutboxOptions {
  readonly databaseName?: string
  readonly indexedDb?: IDBFactory
  readonly keyRange?: typeof IDBKeyRange
}

const getBrowserPersistenceAdapter = () => {
  const storage = globalThis.navigator?.storage
  return typeof storage?.persist === "function"
    ? { request: () => storage.persist() }
    : undefined
}

const requestResult = <Result>(request: IDBRequest<Result>): Promise<Result> =>
  new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    })
    request.addEventListener(
      "error",
      () => reject(request.error ?? outboxStorageUnavailable()),
      { once: true }
    )
  })

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true })
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? outboxStorageUnavailable()),
      { once: true }
    )
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? outboxStorageUnavailable()),
      { once: true }
    )
  })

const abortQuietly = (transaction: IDBTransaction): void => {
  try {
    transaction.abort()
  } catch {
    // The transaction may have finished before the caller handled the error.
  }
}

const mapStorageError = (error: unknown): QuickSaveOutboxError =>
  error instanceof QuickSaveOutboxError ? error : outboxStorageUnavailable()

const removeFromTotals = (
  totals: StoredSubjectTotals,
  entry: StoredQuickSaveOutboxEntry
): StoredSubjectTotals => ({
  byteSize: Math.max(0, totals.byteSize - entry.byteSize),
  count: Math.max(0, totals.count - 1),
  subjectId: totals.subjectId,
})

export const createIndexedDbQuickSaveOutbox = (
  options: IndexedDbQuickSaveOutboxOptions = {}
): QuickSaveOutbox => {
  const resolvedOptions = resolveQuickSaveOutboxOptions({
    ...options,
    persistence: options.persistence ?? getBrowserPersistenceAdapter(),
  })
  const indexedDb = options.indexedDb ?? globalThis.indexedDB
  const keyRange = options.keyRange ?? globalThis.IDBKeyRange
  const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME
  let databasePromise: Promise<IDBDatabase> | undefined

  const openDatabase = (): Promise<IDBDatabase> => {
    if (indexedDb === undefined || keyRange === undefined) {
      return Promise.reject(outboxStorageUnavailable())
    }
    databasePromise ??= new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest
      try {
        request = indexedDb.open(databaseName, DATABASE_VERSION)
      } catch {
        reject(outboxStorageUnavailable())
        return
      }
      request.addEventListener(
        "upgradeneeded",
        () => {
          const database = request.result
          const entries = database.createObjectStore(ENTRY_STORE, {
            keyPath: ["subjectId", "clientRequestId"],
          })
          entries.createIndex(SUBJECT_INDEX, "subjectId")
          entries.createIndex(READY_INDEX, [
            "subjectId",
            "state",
            "readyAtMs",
            "createdAtMs",
            "clientRequestId",
          ])
          database.createObjectStore(SUBJECT_STORE, { keyPath: "subjectId" })
        },
        { once: true }
      )
      request.addEventListener(
        "success",
        () => {
          const database = request.result
          database.addEventListener(
            "versionchange",
            () => {
              database.close()
              databasePromise = undefined
            },
            { once: true }
          )
          resolve(database)
        },
        { once: true }
      )
      const rejectOpen = (): void => {
        databasePromise = undefined
        reject(request.error ?? outboxStorageUnavailable())
      }
      request.addEventListener("error", rejectOpen, { once: true })
      request.addEventListener("blocked", rejectOpen, { once: true })
    })
    return databasePromise
  }

  const runTransaction = async <Result>(
    stores: readonly string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<Result>
  ): Promise<Result> => {
    let transaction: IDBTransaction | undefined
    let done: Promise<void> | undefined
    try {
      const database = await openDatabase()
      transaction = database.transaction(stores, mode)
      done = transactionDone(transaction)
      const result = await operation(transaction)
      await done
      return result
    } catch (error) {
      if (transaction !== undefined) abortQuietly(transaction)
      if (done !== undefined) await done.catch(() => {})
      throw mapStorageError(error)
    }
  }

  const enqueue = async (
    command: EnqueueQuickSaveCommand
  ): Promise<QuickSaveOutboxMutationResult> => {
    const persistencePromise = resolvedOptions.requestPersistence()
    const result = await runTransaction(
      [ENTRY_STORE, SUBJECT_STORE],
      "readwrite",
      async (transaction) => {
        const entries = transaction.objectStore(ENTRY_STORE)
        const subjects = transaction.objectStore(SUBJECT_STORE)
        const entry = createStoredEntry(command, resolvedOptions)
        const key = [command.subjectId, command.clientRequestId]
        const existing = (await requestResult(entries.get(key))) as
          | StoredQuickSaveOutboxEntry
          | undefined
        if (existing !== undefined) {
          if (existing.url !== entry.url) throw outboxConflict()
          return { created: false, entry: toPublicEntry(existing) }
        }

        const totals = ((await requestResult(
          subjects.get(command.subjectId)
        )) as StoredSubjectTotals | undefined) ?? {
          byteSize: 0,
          count: 0,
          subjectId: command.subjectId,
        }
        if (
          totals.count >= resolvedOptions.limits.maxEntries ||
          totals.byteSize + entry.byteSize > resolvedOptions.limits.maxBytes
        ) {
          throw outboxCapacityExceeded()
        }

        entries.add(entry)
        subjects.put({
          byteSize: totals.byteSize + entry.byteSize,
          count: totals.count + 1,
          subjectId: command.subjectId,
        } satisfies StoredSubjectTotals)
        return { created: true, entry: toPublicEntry(entry) }
      }
    )
    return {
      ...result,
      kind: "enqueued",
      persistence: await persistencePromise,
    }
  }

  const claim = async (
    command: Extract<QuickSaveOutboxCommand, { kind: "claim" }>
  ): Promise<QuickSaveOutboxMutationResult> => {
    requireUuid(command.ownerId, "ownerId")
    if (command.subjectId === null) return { entries: [], kind: "claimed" }
    const subjectId = command.subjectId
    requireUuid(subjectId, "subjectId")

    return runTransaction([ENTRY_STORE], "readwrite", async (transaction) => {
      const store = transaction.objectStore(ENTRY_STORE)
      const index = store.index(READY_INDEX)
      const nowMs = resolvedOptions.now()
      if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
        throw new QuickSaveOutboxError(
          "invalid_input",
          "The outbox timestamp is invalid.",
          false
        )
      }
      const lowerQueued = [subjectId, "queued_offline", 0, 0, ""]
      const upperQueued = [
        subjectId,
        "queued_offline",
        nowMs,
        Number.MAX_SAFE_INTEGER,
        "\uffff",
      ]
      const lowerSaving = [subjectId, "saving", 0, 0, ""]
      const upperSaving = [
        subjectId,
        "saving",
        nowMs,
        Number.MAX_SAFE_INTEGER,
        "\uffff",
      ]
      const [queued, expired] = await Promise.all([
        requestResult(
          index.getAll(
            keyRange.bound(lowerQueued, upperQueued),
            resolvedOptions.limits.claimBatchSize
          )
        ),
        requestResult(
          index.getAll(
            keyRange.bound(lowerSaving, upperSaving),
            resolvedOptions.limits.claimBatchSize
          )
        ),
      ])
      const claimed = claimStoredEntries(
        [
          ...(queued as StoredQuickSaveOutboxEntry[]),
          ...(expired as StoredQuickSaveOutboxEntry[]),
        ],
        subjectId,
        command.ownerId,
        resolvedOptions,
        nowMs
      )
      for (const result of claimed) store.put(result.stored)
      return {
        entries: claimed.map((result) => result.claimed),
        kind: "claimed" as const,
      }
    })
  }

  const settle = async (
    command: Extract<QuickSaveOutboxCommand, { kind: "settle" }>
  ): Promise<QuickSaveOutboxMutationResult> => {
    requireUuid(command.subjectId, "subjectId")
    requireUuid(command.clientRequestId, "clientRequestId")
    requireUuid(command.leaseToken, "leaseToken")
    return runTransaction(
      [ENTRY_STORE, SUBJECT_STORE],
      "readwrite",
      async (transaction) => {
        const entries = transaction.objectStore(ENTRY_STORE)
        const subjects = transaction.objectStore(SUBJECT_STORE)
        const key = [command.subjectId, command.clientRequestId]
        const existing = (await requestResult(entries.get(key))) as
          | StoredQuickSaveOutboxEntry
          | undefined
        if (existing === undefined) throw outboxNotFound()
        const result = settleStoredEntry(existing, command, resolvedOptions)
        if (!result.remove) {
          entries.put(result.stored)
          return { entry: result.publicEntry, kind: "settled" as const }
        }

        entries.delete(key)
        const totals = (await requestResult(
          subjects.get(command.subjectId)
        )) as StoredSubjectTotals | undefined
        if (totals === undefined) throw outboxStorageUnavailable()
        const nextTotals = removeFromTotals(totals, existing)
        if (nextTotals.count === 0) subjects.delete(command.subjectId)
        else subjects.put(nextTotals)
        return { entry: result.publicEntry, kind: "settled" as const }
      }
    )
  }

  const dismissFailed = async (
    command: Extract<QuickSaveOutboxCommand, { kind: "dismiss_failed" }>
  ): Promise<QuickSaveOutboxMutationResult> =>
    runTransaction(
      [ENTRY_STORE, SUBJECT_STORE],
      "readwrite",
      async (transaction) => {
        requireUuid(command.subjectId, "subjectId")
        requireUuid(command.clientRequestId, "clientRequestId")
        const entries = transaction.objectStore(ENTRY_STORE)
        const subjects = transaction.objectStore(SUBJECT_STORE)
        const key = [command.subjectId, command.clientRequestId]
        const existing = (await requestResult(entries.get(key))) as
          | StoredQuickSaveOutboxEntry
          | undefined
        if (existing === undefined) throw outboxNotFound()
        if (existing.state !== "save_failed") {
          throw new QuickSaveOutboxError(
            "conflict",
            "Only a failed quick save can be dismissed.",
            false
          )
        }

        const totals = (await requestResult(
          subjects.get(command.subjectId)
        )) as StoredSubjectTotals | undefined
        if (totals === undefined) throw outboxStorageUnavailable()
        entries.delete(key)
        const nextTotals = removeFromTotals(totals, existing)
        if (nextTotals.count === 0) subjects.delete(command.subjectId)
        else subjects.put(nextTotals)
        return { kind: "dismissed" as const }
      }
    )

  const clearSubject = async (
    command: Extract<QuickSaveOutboxCommand, { kind: "clear_subject" }>
  ): Promise<QuickSaveOutboxMutationResult> =>
    runTransaction(
      [ENTRY_STORE, SUBJECT_STORE],
      "readwrite",
      async (transaction) => {
        requireUuid(command.subjectId, "subjectId")
        const entries = transaction.objectStore(ENTRY_STORE)
        const keys = await requestResult(
          entries
            .index(SUBJECT_INDEX)
            .getAllKeys(command.subjectId, MAX_OUTBOX_ENTRIES)
        )
        for (const key of keys) entries.delete(key)
        transaction.objectStore(SUBJECT_STORE).delete(command.subjectId)
        return { count: keys.length, kind: "cleared" as const }
      }
    )

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
      return runTransaction([ENTRY_STORE], "readonly", async (transaction) => {
        const entries = (await requestResult(
          transaction
            .objectStore(ENTRY_STORE)
            .index(SUBJECT_INDEX)
            .getAll(request.subjectId, MAX_OUTBOX_ENTRIES)
        )) as StoredQuickSaveOutboxEntry[]
        return entries
          .sort(
            (left, right) =>
              left.createdAtMs - right.createdAtMs ||
              left.clientRequestId.localeCompare(right.clientRequestId)
          )
          .map((entry) => toPublicEntry(entry))
      })
    },
  }
}
