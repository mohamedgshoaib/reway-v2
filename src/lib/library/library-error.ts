export type LibraryErrorCode =
  | "not_found"
  | "conflict"
  | "invalid_input"
  | "forbidden"
  | "offline"
  | "unexpected"

export class LibraryError extends Error {
  readonly code: LibraryErrorCode
  readonly retrySafe: boolean

  constructor(code: LibraryErrorCode, message: string, retrySafe: boolean) {
    super(message)
    this.name = "LibraryError"
    this.code = code
    this.retrySafe = retrySafe
  }
}

export const invalidLibraryInput = (message: string): LibraryError =>
  new LibraryError("invalid_input", message, false)
