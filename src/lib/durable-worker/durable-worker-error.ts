export class DurableWorkerError extends Error {
  readonly code: "database_unavailable" | "invalid_database_result"
  readonly retrySafe: boolean

  constructor(
    code: DurableWorkerError["code"],
    message: string,
    retrySafe: boolean
  ) {
    super(message)
    this.name = "DurableWorkerError"
    this.code = code
    this.retrySafe = retrySafe
  }
}
