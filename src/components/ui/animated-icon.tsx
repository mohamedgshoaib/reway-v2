"use client"

import { AnimatePresence, m, useReducedMotion } from "motion/react"
import type React from "react"

import { easeOutStrong } from "@/lib/motion"

/**
 * Swaps its child whenever `transitionKey` changes. The default keeps the
 * compact blur/scale effect used by feedback buttons; `crossfade` is the
 * compositor-only option for controls that change during larger layout motion.
 * Requires `m` because the root LazyMotion provider runs in strict mode.
 */
export function AnimatedIcon({
  children,
  className,
  variant = "blur-scale",
  transitionKey,
}: {
  children: React.ReactNode
  className?: string
  variant?: "blur-scale" | "crossfade"
  transitionKey: string | number
}): React.ReactElement {
  const shouldReduceMotion = useReducedMotion()
  const crossfade = variant === "crossfade"
  const opacityOnly = shouldReduceMotion || crossfade

  return (
    <AnimatePresence initial={false} mode={crossfade ? "sync" : "popLayout"}>
      <m.span
        animate={
          crossfade
            ? { opacity: 1 }
            : { filter: "blur(0px)", opacity: 1, scale: 1 }
        }
        className={className}
        exit={
          opacityOnly
            ? { opacity: 0 }
            : { filter: "blur(4px)", opacity: 0, scale: 0.25 }
        }
        initial={
          opacityOnly
            ? { opacity: 0 }
            : { filter: "blur(4px)", opacity: 0, scale: 0.25 }
        }
        key={transitionKey}
        transition={
          crossfade
            ? { duration: 0.12, ease: easeOutStrong }
            : { bounce: 0, duration: 0.3, type: "spring" }
        }
      >
        {children}
      </m.span>
    </AnimatePresence>
  )
}
