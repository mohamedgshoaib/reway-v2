import { invalidLibraryInput } from "@/lib/library/library-error"

export type LibraryCursorKind = "bookmarks" | "collections" | "tags"
export type LibraryCursorValue = number | string | null

export interface LibraryCursorPayload {
  binding: string
  id: string
  kind: LibraryCursorKind
  values: LibraryCursorValue[]
  version: 1
}

const MAX_CURSOR_LENGTH = 4_096
const MAX_CURSOR_VALUES = 4
const MAX_CURSOR_STRING_VALUE_LENGTH = 2_000
const DATABASE_ID_PATTERN = /^[1-9]\d*$/

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const isCursorValue = (value: unknown): value is LibraryCursorValue =>
  value === null ||
  (typeof value === "string" &&
    value.length <= MAX_CURSOR_STRING_VALUE_LENGTH) ||
  (typeof value === "number" && Number.isFinite(value))

const isCursorPayload = (value: unknown): value is LibraryCursorPayload => {
  if (typeof value !== "object" || value === null) return false

  const payload = value as Record<string, unknown>
  return (
    payload.version === 1 &&
    (payload.kind === "bookmarks" ||
      payload.kind === "collections" ||
      payload.kind === "tags") &&
    typeof payload.binding === "string" &&
    payload.binding.length > 0 &&
    payload.binding.length <= 160 &&
    typeof payload.id === "string" &&
    DATABASE_ID_PATTERN.test(payload.id) &&
    payload.id.length <= 64 &&
    Array.isArray(payload.values) &&
    payload.values.length <= MAX_CURSOR_VALUES &&
    payload.values.every(isCursorValue)
  )
}

export const encodeLibraryCursor = (payload: LibraryCursorPayload): string => {
  if (!isCursorPayload(payload)) {
    throw invalidLibraryInput("The pagination cursor is invalid.")
  }

  const cursor = bytesToBase64(
    new TextEncoder().encode(JSON.stringify(payload))
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "")

  if (cursor.length > MAX_CURSOR_LENGTH) {
    throw invalidLibraryInput("The pagination cursor is too large.")
  }
  return cursor
}

export const decodeLibraryCursor = (
  cursor: string,
  expectedKind: LibraryCursorKind,
  expectedBinding: string
): LibraryCursorPayload => {
  if (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH) {
    throw invalidLibraryInput("The pagination cursor is invalid.")
  }

  try {
    const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/")
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
      base64ToBytes(`${base64}${padding}`)
    )
    const payload: unknown = JSON.parse(decoded)

    if (
      !isCursorPayload(payload) ||
      payload.kind !== expectedKind ||
      payload.binding !== expectedBinding
    ) {
      throw invalidLibraryInput(
        "The pagination cursor does not match this view."
      )
    }

    return payload
  } catch (error) {
    if (error instanceof Error && error.name === "LibraryError") throw error
    throw invalidLibraryInput("The pagination cursor is invalid.")
  }
}
