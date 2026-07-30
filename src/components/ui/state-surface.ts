import { cva, type VariantProps } from "class-variance-authority"

/**
 * Keeps adjacent hit targets contiguous while separating their visible state
 * paint only along the axis where they touch.
 */
export const stateSurfaceVariants = cva(
  "relative isolate before:pointer-events-none before:absolute before:-z-10 before:transition-colors before:duration-150 before:ease-out-strong",
  {
    defaultVariants: {
      axis: "none",
    },
    variants: {
      axis: {
        block: "before:inset-x-0 before:inset-y-px",
        both: "before:inset-px",
        inline: "before:inset-x-px before:inset-y-0",
        none: "before:inset-0",
      },
    },
  }
)

export type StateSurfaceAxis = NonNullable<
  VariantProps<typeof stateSurfaceVariants>["axis"]
>
