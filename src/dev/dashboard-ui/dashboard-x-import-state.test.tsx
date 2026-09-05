import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { XImportPost } from "@/dev/dashboard-ui/dashboard-x-import"
import { useDashboardXImportState } from "@/dev/dashboard-ui/dashboard-x-import-state"
import type {
  DashboardXImportMutationAdapter,
  XImportResultSummary,
} from "@/dev/dashboard-ui/dashboard-x-import-state"

function createPostImportedMock() {
  return vi.fn<(post: XImportPost, importId: string) => void>()
}

function createResultMock() {
  return vi.fn<(summary: XImportResultSummary) => void>()
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolvePromise: (() => void) | undefined
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: () => resolvePromise?.() }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("dashboard X import state", () => {
  it("creates a selected review and keeps row selection in the review step", () => {
    const { result } = renderHook(() =>
      useDashboardXImportState({
        existingUrls: new Set(),
        onPostImported: createPostImportedMock(),
        onResult: createResultMock(),
      })
    )

    act(() => result.current.actions.chooseFile("bookmarks.js"))
    expect(result.current.flow.stage).toBe("review")
    expect(result.current.flow.selectedIds.size).toBe(6)

    const firstId = result.current.flow.review?.posts[0].entryId
    if (!firstId) throw new Error("Expected a review row.")
    act(() => result.current.actions.setPostSelected(firstId, false))
    expect(result.current.flow.selectedIds.size).toBe(5)

    act(() => result.current.actions.clearSelection())
    expect(result.current.flow.selectedIds.size).toBe(0)
    act(() => result.current.actions.selectAll())
    expect(result.current.flow.selectedIds.size).toBe(6)
  })

  it("reports progress and commits every successful post once", async () => {
    const onPostImported = createPostImportedMock()
    const onResult = createResultMock()
    const { result } = renderHook(() =>
      useDashboardXImportState({
        existingUrls: new Set(),
        onPostImported,
        onResult,
      })
    )
    act(() => result.current.actions.chooseFile("bookmarks.js"))

    let importPromise: Promise<void> | undefined
    act(() => {
      importPromise = result.current.actions.startImport()
    })
    expect(result.current.flow).toMatchObject({
      processedCount: 0,
      progressStep: "preparing",
      stage: "importing",
    })

    await act(async () => {
      await vi.runAllTimersAsync()
      await importPromise
    })
    expect(result.current.flow).toMatchObject({
      processedCount: 6,
      stage: "complete",
      totalCount: 6,
    })
    expect(result.current.flow.failedIds.size).toBe(0)
    expect(onPostImported).toHaveBeenCalledTimes(6)
    expect(onResult).toHaveBeenCalledWith({
      failedCount: 0,
      importedCount: 6,
      totalCount: 6,
    })
  })

  it("retries only failed posts after partial success", async () => {
    const onPostImported = createPostImportedMock()
    const { result } = renderHook(() =>
      useDashboardXImportState({
        existingUrls: new Set(),
        onPostImported,
        onResult: createResultMock(),
      })
    )
    act(() => {
      result.current.actions.setInitialOutcome("partial")
      result.current.actions.chooseFile("bookmarks.js")
    })

    let initialPromise: Promise<void> | undefined
    act(() => {
      initialPromise = result.current.actions.startImport()
    })
    await act(async () => {
      await vi.runAllTimersAsync()
      await initialPromise
    })
    expect(result.current.flow.stage).toBe("complete")
    expect(result.current.flow.importedIds.size).toBe(4)
    expect(result.current.flow.failedIds.size).toBe(2)

    let retryPromise: Promise<void> | undefined
    act(() => {
      retryPromise = result.current.actions.retryImport()
    })
    await act(async () => {
      await vi.runAllTimersAsync()
      await retryPromise
    })
    expect(result.current.flow.importedIds.size).toBe(6)
    expect(result.current.flow.failedIds.size).toBe(0)
    expect(onPostImported).toHaveBeenCalledTimes(6)
  })

  it("keeps the review after total failure and repeated retry failure", async () => {
    const { result } = renderHook(() =>
      useDashboardXImportState({
        existingUrls: new Set(),
        onPostImported: createPostImportedMock(),
        onResult: createResultMock(),
      })
    )
    act(() => {
      result.current.actions.setInitialOutcome("failure")
      result.current.actions.setRetryOutcome("failure")
      result.current.actions.chooseFile("bookmarks.js")
    })

    let initialPromise: Promise<void> | undefined
    act(() => {
      initialPromise = result.current.actions.startImport()
    })
    await act(async () => {
      await vi.runAllTimersAsync()
      await initialPromise
    })
    expect(result.current.flow.stage).toBe("error")
    expect(result.current.flow.failedIds.size).toBe(6)
    expect(result.current.flow.review?.fileName).toBe("bookmarks.js")

    let retryPromise: Promise<void> | undefined
    act(() => {
      retryPromise = result.current.actions.retryImport()
    })
    await act(async () => {
      await vi.runAllTimersAsync()
      await retryPromise
    })
    expect(result.current.flow.stage).toBe("error")
    expect(result.current.flow.review?.fileName).toBe("bookmarks.js")
  })

  it("ignores a stale mutation result after the demo resets", async () => {
    const mutation = deferred()
    const onPostImported = createPostImportedMock()
    const mutationAdapter = vi.fn<DashboardXImportMutationAdapter>(
      () => mutation.promise
    )
    const { result } = renderHook(() =>
      useDashboardXImportState({
        existingUrls: new Set(),
        mutationAdapter,
        onPostImported,
        onResult: createResultMock(),
      })
    )
    act(() => result.current.actions.chooseFile("bookmarks.js"))

    let importPromise: Promise<void> | undefined
    act(() => {
      importPromise = result.current.actions.startImport()
    })
    await act(async () => vi.advanceTimersByTimeAsync(240))
    expect(mutationAdapter).toHaveBeenCalledTimes(1)

    act(() => result.current.actions.resetDemo())
    await act(async () => {
      mutation.resolve()
      await importPromise
    })
    expect(result.current.flow.stage).toBe("choose")
    expect(onPostImported).not.toHaveBeenCalled()
  })
})
