import { rm } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { build } from "esbuild"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const distDirectory = resolve(projectRoot, "dist")
const workerDirectory = resolve(distDirectory, "worker")

if (dirname(workerDirectory) !== distDirectory) {
  throw new Error("The worker output directory is invalid.")
}

await rm(workerDirectory, { force: true, recursive: true })
await build({
  absWorkingDir: projectRoot,
  bundle: true,
  chunkNames: "chunks/[name]-[hash]",
  entryNames: "durable-worker",
  entryPoints: ["server/vercel-durable-worker.ts"],
  format: "esm",
  logLevel: "info",
  minify: true,
  outdir: workerDirectory,
  platform: "node",
  splitting: true,
  target: "node24",
})
