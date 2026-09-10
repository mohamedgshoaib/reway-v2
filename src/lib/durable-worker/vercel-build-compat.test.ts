import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface VercelTypeScriptCompiler {
  readonly readConfigFile?: unknown
  readonly sys?: { readonly readFile?: unknown }
}

const require = createRequire(import.meta.url)

describe("Vercel TypeScript compatibility", () => {
  it("keeps the compiler interface used by the Vercel Node builder", () => {
    const typescript = require("typescript") as VercelTypeScriptCompiler

    expect(typescript.readConfigFile).toBeTypeOf("function")
    expect(typescript.sys?.readFile).toBeTypeOf("function")
  })

  it("keeps Photon in a split worker chunk", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as { scripts?: { "build:worker"?: string } }
    const command = packageJson.scripts?.["build:worker"]
    const buildSource = readFileSync(
      resolve(process.cwd(), "scripts/build-vercel-worker.mjs"),
      "utf8"
    )

    expect(command).toBe("node scripts/build-vercel-worker.mjs")
    expect(buildSource).toContain('chunkNames: "chunks/[name]-[hash]"')
    expect(buildSource).toContain("minify: true")
    expect(buildSource).toContain("splitting: true")
    expect(buildSource).toContain(
      "await rm(workerDirectory, { force: true, recursive: true })"
    )
  })
})
