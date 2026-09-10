import { describe, expect, it } from "vitest"

import durableWorker from "../../../server/vercel-durable-worker"

describe("Vercel durable worker entrypoint", () => {
  it("loads the Node worker bundle and rejects non-POST requests", async () => {
    const response = await durableWorker.fetch(
      new Request("https://reway.example/api/durable-worker", {
        method: "GET",
      })
    )

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("POST")
  })
})
