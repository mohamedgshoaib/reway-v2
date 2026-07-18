"use client"

import { AnimatePresence, m, useReducedMotion } from "motion/react"
import type React from "react"

/**
 * Swaps its child for a new one whenever `transitionKey` changes, animating
 * opacity/scale/blur instead of an instant toggle. Requires the `m` component
 * (not `motion`) since the root LazyMotion provider runs in `strict` mode.
 * Falls back to an opacity-only cross-fade under `prefers-reduced-motion`.
 */
export function AnimatedIcon({
  children,
  className,
  transitionKey,
}: {
  children: React.ReactNode
  className?: string
  transitionKey: string | number
}): React.ReactElement {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <m.span
        animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
        className={className}
        exit={
          shouldReduceMotion
            ? { opacity: 0 }
            : { filter: "blur(4px)", opacity: 0, scale: 0.25 }
        }
        initial={
          shouldReduceMotion
            ? { opacity: 0 }
            : { filter: "blur(4px)", opacity: 0, scale: 0.25 }
        }
        key={transitionKey}
        transition={{ bounce: 0, duration: 0.3, type: "spring" }}
      >
        {children}
      </m.span>
    </AnimatePresence>
  )
}
