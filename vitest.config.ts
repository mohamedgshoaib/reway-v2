import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
})

export default config
