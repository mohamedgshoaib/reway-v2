import type {
  DurableEnvelope,
  DurableWorkerHandler,
  DurableWorkOutcome,
} from "../durable-worker/durable-worker-types.ts"
import type { PinnedHttpFetcher } from "../network-safety/pinned-http-fetch.ts"
import { PinnedHttpFetchError } from "../network-safety/pinned-http-fetch.ts"
import { normalizeHttpUrl } from "../network-safety/url-policy.ts"
import type {
  BookmarkAssetKind,
  BookmarkAssetProcessor,
} from "./bookmark-asset-processor.ts"
import {
  MAX_HTML_RESPONSE_BYTES,
  PageMetadataError,
  parsePageMetadata,
} from "./page-metadata.ts"

const HTML_CONTENT_TYPES = new Set(["application/xhtml+xml", "text/html"])
const IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const IMAGE_SOURCE_LIMITS = {
  favicon: 512 * 1024,
  og_image: 5 * 1024 * 1024,
} as const

export interface EnrichmentWorkInput {
  readonly fallbackTitle: string
  readonly url: string
}

export interface EnrichmentWorkSource {
  read(
    envelope: Extract<DurableEnvelope, { workKind: "enrichment" }>,
    leaseToken: string,
    signal: AbortSignal
  ): Promise<EnrichmentWorkInput | null>
}

export interface EnrichmentHandlerResult {
  readonly domain: string
  readonly faviconAssetId: string | null
  readonly ogImageAssetId: string | null
  readonly title: string
}

export interface EnrichmentHandlerDependencies {
  readonly assets: BookmarkAssetProcessor
  readonly createAssetId: () => string
  readonly fetcher: PinnedHttpFetcher
  readonly monotonicNow?: () => number
  readonly source: EnrichmentWorkSource
}

interface MutableStageTimings {
  assetProcessingMs: number
  fetchMs: number
}

const defaultMonotonicNow = (): number => performance.now()

const measureStage = async <Result>(
  stage: keyof MutableStageTimings,
  timings: MutableStageTimings,
  now: () => number,
  operation: () => Promise<Result>
): Promise<Result> => {
  const startedAt = now()
  try {
    return await operation()
  } finally {
    timings[stage] += Math.max(0, now() - startedAt)
  }
}

const toFailure = (
  error: unknown
): Exclude<DurableWorkOutcome<never>, { status: "succeeded" }> => {
  if (error instanceof PinnedHttpFetchError) {
    return error.retrySafe
      ? {
          code: error.code,
          retryAfterMs: error.retryAfterMs,
          status: "transient_failure",
        }
      : { code: error.code, status: "permanent_failure" }
  }
  if (error instanceof PageMetadataError) {
    return { code: error.code, status: "permanent_failure" }
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "retrySafe" in error &&
    typeof error.retrySafe === "boolean" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.retrySafe
      ? { code: error.code, status: "transient_failure" }
      : { code: error.code, status: "permanent_failure" }
  }
  return { code: "enrichment_failed", status: "transient_failure" }
}

const fetchAsset = async (
  kind: BookmarkAssetKind,
  url: string | null,
  envelope: Extract<DurableEnvelope, { workKind: "enrichment" }>,
  options: { attemptNumber: number; leaseToken: string; signal: AbortSignal },
  dependencies: EnrichmentHandlerDependencies,
  timings: MutableStageTimings,
  monotonicNow: () => number
): Promise<string | null> => {
  if (url === null) return null
  let response: Awaited<ReturnType<PinnedHttpFetcher["fetch"]>>
  try {
    response = await measureStage("fetchMs", timings, monotonicNow, () =>
      dependencies.fetcher.fetch({
        acceptedContentTypes: IMAGE_CONTENT_TYPES,
        maxBodyBytes: IMAGE_SOURCE_LIMITS[kind],
        signal: options.signal,
        url,
      })
    )
  } catch (error) {
    if (error instanceof PinnedHttpFetchError && !error.retrySafe) return null
    throw error
  }

  const assetId = dependencies.createAssetId()
  const result = await measureStage(
    "assetProcessingMs",
    timings,
    monotonicNow,
    () =>
      dependencies.assets.process({
        assetId,
        attemptNumber: options.attemptNumber,
        bytes: response.body,
        declaredContentType: response.contentType,
        generation: envelope.generation,
        kind,
        leaseToken: options.leaseToken,
        requestId: envelope.requestId,
        signal: options.signal,
      })
  )
  if (result.status === "ready") return result.assetId
  if (result.status === "stale")
    throw new Error("The enrichment lease is stale.")
  return null
}

export const createEnrichmentHandler = (
  dependencies: EnrichmentHandlerDependencies
): DurableWorkerHandler<EnrichmentHandlerResult> => ({
  run: async (envelope, options) => {
    if (envelope.workKind !== "enrichment") {
      return { code: "unsupported_work_kind", status: "permanent_failure" }
    }
    const monotonicNow = dependencies.monotonicNow ?? defaultMonotonicNow
    const stageTimings: MutableStageTimings = {
      assetProcessingMs: 0,
      fetchMs: 0,
    }
    try {
      const input = await dependencies.source.read(
        envelope,
        options.leaseToken,
        options.signal
      )
      if (input === null) {
        return {
          code: "stale_generation",
          stageTimings,
          status: "permanent_failure",
        }
      }
      const page = await measureStage(
        "fetchMs",
        stageTimings,
        monotonicNow,
        () =>
          dependencies.fetcher.fetch({
            acceptedContentTypes: HTML_CONTENT_TYPES,
            maxBodyBytes: MAX_HTML_RESPONSE_BYTES,
            signal: options.signal,
            url: input.url,
          })
      )
      const metadata = parsePageMetadata({
        body: page.body,
        contentType: page.contentType,
        finalUrl: page.finalUrl,
      })
      const finalUrl = normalizeHttpUrl(page.finalUrl)
      if (!finalUrl.ok) {
        return { code: "invalid_final_url", status: "permanent_failure" }
      }
      const faviconAssetId = await fetchAsset(
        "favicon",
        metadata.faviconUrl,
        envelope,
        options,
        dependencies,
        stageTimings,
        monotonicNow
      )
      const ogImageAssetId = await fetchAsset(
        "og_image",
        metadata.ogImageUrl,
        envelope,
        options,
        dependencies,
        stageTimings,
        monotonicNow
      )
      return {
        result: {
          domain: finalUrl.value.hostname,
          faviconAssetId,
          ogImageAssetId,
          title: metadata.title ?? input.fallbackTitle,
        },
        stageTimings,
        status: "succeeded",
      }
    } catch (error) {
      return { ...toFailure(error), stageTimings }
    }
  },
})
