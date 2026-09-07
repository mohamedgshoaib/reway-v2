import type { PostgrestError } from "@supabase/supabase-js"

import { invalidLibraryInput, LibraryError } from "@/lib/library/library-error"

export const mapPostgrestError = (error: PostgrestError): LibraryError => {
  switch (error.code) {
    case "23505":
      return new LibraryError(
        "conflict",
        "The library item already exists.",
        false
      )
    case "23503":
    case "P0002":
    case "PGRST116":
      return new LibraryError(
        "not_found",
        "The library item was not found.",
        false
      )
    case "22023":
    case "22P02":
    case "23514":
      return invalidLibraryInput("The library request is invalid.")
    case "40001":
      return new LibraryError(
        "conflict",
        "The library changed. Refetch and retry.",
        true
      )
    case "42501":
      return new LibraryError("forbidden", "This action is not allowed.", false)
    case "":
    case "PGRST000":
    case "PGRST001":
    case "PGRST002":
      return new LibraryError("offline", "The library is unavailable.", true)
    default:
      return new LibraryError("unexpected", "The library request failed.", true)
  }
}

export const throwPostgrestError = (error: PostgrestError): never => {
  throw mapPostgrestError(error)
}
