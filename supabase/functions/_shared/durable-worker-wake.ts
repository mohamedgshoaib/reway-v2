export const EDGE_WORKER_QUEUE_NAMES = [
  "reway_enrichment_interactive",
  "reway_enrichment_bulk",
  "reway_transfer_mutating",
  "reway_transfer_export",
] as const

export type EdgeWorkerQueueName = (typeof EDGE_WORKER_QUEUE_NAMES)[number]

export interface DurableWorkerWakeOptions {
  enabledQueues: ReadonlySet<EdgeWorkerQueueName>
  runQueue: (queueName: EdgeWorkerQueueName) => Promise<Record<string, number>>
  wakeToken: string | undefined
}

const MAX_BODY_BYTES = 256
const WAKE_TOKEN_HEADER = "x-reway-worker-wake"
const queueNames = new Set<string>(EDGE_WORKER_QUEUE_NAMES)
const encoder = new TextEncoder()

const jsonResponse = (
  status: number,
  body: Record<string, unknown>
): Response =>
  Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  })

const digest = async (value: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))

const tokensMatch = async (
  expected: string,
  received: string
): Promise<boolean> => {
  const [expectedDigest, receivedDigest] = await Promise.all([
    digest(expected),
    digest(received),
  ])
  let difference = 0
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= expectedDigest[index] ^ receivedDigest[index]
  }
  return difference === 0
}

const readBoundedBody = async (request: Request): Promise<string | null> => {
  const contentLength = request.headers.get("content-length")
  if (contentLength !== null) {
    const parsedLength = Number(contentLength)
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAX_BODY_BYTES
    ) {
      return null
    }
  }

  if (!request.body) return ""
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    byteLength += value.byteLength
    if (byteLength > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const body = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

const readQueueName = async (
  request: Request
): Promise<EdgeWorkerQueueName | null> => {
  const body = await readBoundedBody(request)
  if (body === null) return null

  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    return null
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  const fields = Object.keys(value)
  const queueName = (value as Record<string, unknown>).queue_name
  if (
    fields.length !== 1 ||
    typeof queueName !== "string" ||
    !queueNames.has(queueName)
  ) {
    return null
  }
  return queueName as EdgeWorkerQueueName
}

export const handleDurableWorkerWake = async (
  request: Request,
  options: DurableWorkerWakeOptions
): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response(null, {
      headers: { Allow: "POST", "Cache-Control": "no-store" },
      status: 405,
    })
  }

  if (!options.wakeToken) {
    return jsonResponse(503, { code: "worker_not_configured" })
  }
  const receivedToken = request.headers.get(WAKE_TOKEN_HEADER) ?? ""
  if (!(await tokensMatch(options.wakeToken, receivedToken))) {
    return jsonResponse(401, { code: "unauthorized" })
  }

  const queueName = await readQueueName(request)
  if (queueName === null) {
    return jsonResponse(400, { code: "invalid_request" })
  }
  if (!options.enabledQueues.has(queueName)) {
    return jsonResponse(409, { code: "worker_not_enabled" })
  }

  const result = await options.runQueue(queueName)
  return jsonResponse(200, { code: "worker_run_complete", result })
}
