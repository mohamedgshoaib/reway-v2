import * as React from "react"

import {
  createXArchiveReview,
  createXImportSelection,
  planXImportFailures,
  setXImportPostSelected,
  type XArchiveFixture,
  type XImportOutcome,
  type XImportPost,
  type XImportReview,
  type XImportSpeed,
} from "@/dev/dashboard-ui/dashboard-x-import"
import { useMountEffect } from "@/hooks/use-mount-effect"

const IMPORT_DELAYS = {
  fast: { finish: 160, item: 80, prepare: 160 },
  slow: { finish: 900, item: 650, prepare: 900 },
} as const satisfies Record<
  XImportSpeed,
  { finish: number; item: number; prepare: number }
>

export type XImportStage =
  | "choose"
  | "empty"
  | "review"
  | "importing"
  | "complete"
  | "error"

export type XImportProgressStep = "preparing" | "saving" | "finishing"

export interface XImportFlowState {
  failedIds: ReadonlySet<string>
  fileName: string | null
  importedIds: ReadonlySet<string>
  message: string | null
  processedCount: number
  progressStep: XImportProgressStep | null
  review: XImportReview | null
  selectedIds: ReadonlySet<string>
  stage: XImportStage
  totalCount: number
}

export interface XImportResultSummary {
  failedCount: number
  importedCount: number
  totalCount: number
}

export type DashboardXImportMutationAdapter = (
  post: XImportPost
) => Promise<void>

export interface DashboardXImportState {
  actions: {
    chooseAnotherFile: () => void
    chooseFile: (fileName: string) => void
    clearSelection: () => void
    resetDemo: () => void
    retryImport: () => Promise<void>
    selectAll: () => void
    setArchiveFixture: (fixture: XArchiveFixture) => void
    setInitialOutcome: (outcome: XImportOutcome) => void
    setPostSelected: (entryId: string, selected: boolean) => void
    setRetryOutcome: (outcome: XImportOutcome) => void
    setSpeed: (speed: XImportSpeed) => void
    startImport: () => Promise<void>
  }
  demo: {
    archiveFixture: XArchiveFixture
    initialOutcome: XImportOutcome
    retryOutcome: XImportOutcome
    speed: XImportSpeed
  }
  flow: XImportFlowState
}

function createInitialFlow(): XImportFlowState {
  return {
    failedIds: new Set(),
    fileName: null,
    importedIds: new Set(),
    message: null,
    processedCount: 0,
    progressStep: null,
    review: null,
    selectedIds: new Set(),
    stage: "choose",
    totalCount: 0,
  }
}

function waitFor(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}

export function useDashboardXImportState({
  existingUrls,
  mutationAdapter,
  onPostImported,
  onResult,
}: {
  existingUrls: ReadonlySet<string>
  mutationAdapter?: DashboardXImportMutationAdapter
  onPostImported: (post: XImportPost, importId: string) => void
  onResult: (summary: XImportResultSummary) => void
}): DashboardXImportState {
  const [flow, setFlow] = React.useState<XImportFlowState>(createInitialFlow)
  const [archiveFixture, setArchiveFixture] =
    React.useState<XArchiveFixture>("valid")
  const [initialOutcome, setInitialOutcome] =
    React.useState<XImportOutcome>("success")
  const [retryOutcome, setRetryOutcome] =
    React.useState<XImportOutcome>("success")
  const [speed, setSpeed] = React.useState<XImportSpeed>("fast")
  const runTokenRef = React.useRef(0)
  const importNumberRef = React.useRef(0)

  useMountEffect(() => () => {
    runTokenRef.current += 1
  })

  const resetFlow = (): void => {
    runTokenRef.current += 1
    setFlow(createInitialFlow())
  }

  const chooseFile = (fileName: string): void => {
    if (flow.stage === "importing") return
    const result = createXArchiveReview({
      existingUrls,
      fileName,
      fixture: archiveFixture,
    })

    if (result.kind === "error") {
      setFlow({
        ...createInitialFlow(),
        fileName: result.fileName,
        message: result.message,
        stage: "error",
      })
      return
    }
    if (result.kind === "empty") {
      setFlow({
        ...createInitialFlow(),
        fileName: result.fileName,
        stage: "empty",
      })
      return
    }

    setFlow({
      ...createInitialFlow(),
      fileName: result.review.fileName,
      review: result.review,
      selectedIds: createXImportSelection(result.review.posts),
      stage: "review",
      totalCount: result.review.posts.length,
    })
  }

  const runImport = async (retry: boolean): Promise<void> => {
    if (!flow.review || flow.stage === "importing") return

    const candidateIds = retry ? flow.failedIds : flow.selectedIds
    if (candidateIds.size === 0) return

    const candidates = flow.review.posts.filter((post) =>
      candidateIds.has(post.entryId)
    )
    const failedPlan = planXImportFailures(
      candidates.map((post) => post.entryId),
      retry ? retryOutcome : initialOutcome
    )
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    importNumberRef.current += 1
    const importId = `run-${importNumberRef.current}`
    const delays = IMPORT_DELAYS[speed]
    const importedIds = new Set(flow.importedIds)
    const failedIds = new Set<string>()

    setFlow((current) => ({
      ...current,
      failedIds: new Set(),
      message: null,
      processedCount: 0,
      progressStep: "preparing",
      stage: "importing",
      totalCount: candidates.length,
    }))

    await waitFor(delays.prepare)
    if (runTokenRef.current !== token) return
    setFlow((current) => ({ ...current, progressStep: "saving" }))

    for (const post of candidates) {
      await waitFor(delays.item)
      if (runTokenRef.current !== token) return

      let failed = failedPlan.has(post.entryId)
      if (!failed && mutationAdapter) {
        try {
          await mutationAdapter(post)
        } catch {
          failed = true
        }
      }
      if (runTokenRef.current !== token) return

      if (failed) {
        failedIds.add(post.entryId)
      } else {
        importedIds.add(post.entryId)
        onPostImported(post, importId)
      }

      setFlow((current) => ({
        ...current,
        failedIds: new Set(failedIds),
        importedIds: new Set(importedIds),
        processedCount: current.processedCount + 1,
      }))
    }

    setFlow((current) => ({ ...current, progressStep: "finishing" }))
    await waitFor(delays.finish)
    if (runTokenRef.current !== token) return

    const summary = {
      failedCount: failedIds.size,
      importedCount: importedIds.size,
      totalCount: flow.selectedIds.size,
    }
    setFlow((current) => ({
      ...current,
      failedIds: new Set(failedIds),
      importedIds: new Set(importedIds),
      message:
        failedIds.size === 0
          ? "Every selected bookmark was imported."
          : importedIds.size === 0
            ? "No bookmarks were imported. Your review is still here."
            : "Successful bookmarks were kept. Retry the remaining failures.",
      processedCount: candidates.length,
      progressStep: null,
      stage:
        failedIds.size > 0 && importedIds.size === 0 ? "error" : "complete",
      totalCount: flow.selectedIds.size,
    }))
    onResult(summary)
  }

  return {
    actions: {
      chooseAnotherFile: resetFlow,
      chooseFile,
      clearSelection: () => {
        if (flow.stage !== "review") return
        setFlow((current) => ({ ...current, selectedIds: new Set() }))
      },
      resetDemo: () => {
        resetFlow()
        setArchiveFixture("valid")
        setInitialOutcome("success")
        setRetryOutcome("success")
        setSpeed("fast")
      },
      retryImport: () => runImport(true),
      selectAll: () => {
        if (flow.stage !== "review" || !flow.review) return
        setFlow((current) => ({
          ...current,
          selectedIds: createXImportSelection(flow.review?.posts ?? []),
        }))
      },
      setArchiveFixture,
      setInitialOutcome,
      setPostSelected: (entryId, selected) => {
        if (flow.stage !== "review") return
        setFlow((current) => ({
          ...current,
          selectedIds: setXImportPostSelected({
            entryId,
            selected,
            selectedIds: current.selectedIds,
          }),
        }))
      },
      setRetryOutcome,
      setSpeed,
      startImport: () => runImport(false),
    },
    demo: { archiveFixture, initialOutcome, retryOutcome, speed },
    flow,
  }
}
