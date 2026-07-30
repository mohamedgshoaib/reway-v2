import { describe, expect, it } from "vitest"

import { buttonVariants } from "@/components/ui/button"

describe("buttonVariants", () => {
  it("expands and centers the hit area without changing icon size", () => {
    const className = buttonVariants({ size: "icon-xs" })

    expect(className).toContain("after:left-1/2")
    expect(className).toContain("after:top-1/2")
    expect(className).toContain("after:-translate-1/2")
    expect(className).toContain("after:min-h-10")
    expect(className).toContain("after:min-w-10")
    expect(className).toContain("pointer-coarse:after:min-h-11")
    expect(className).toContain("pointer-coarse:after:min-w-11")
    expect(className).toContain("size-7")
    expect(className).toContain("sm:size-6")
  })
})
