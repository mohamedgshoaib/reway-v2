export const appearancePalette = [
  "neutral",
  "red",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "rose",
] as const

export type AppearancePaletteColor = (typeof appearancePalette)[number]

export type AppearanceColor = {
  kind: "palette"
  value: AppearancePaletteColor
}

export const neutralAppearanceColor: AppearanceColor = {
  kind: "palette",
  value: "neutral",
}

export const appearanceTextClasses: Record<AppearancePaletteColor, string> = {
  amber: "text-amber-700 dark:text-amber-400",
  blue: "text-blue-700 dark:text-blue-400",
  cyan: "text-cyan-700 dark:text-cyan-400",
  green: "text-green-700 dark:text-green-400",
  indigo: "text-indigo-700 dark:text-indigo-400",
  lime: "text-lime-700 dark:text-lime-400",
  neutral: "text-neutral-600 dark:text-neutral-400",
  orange: "text-orange-700 dark:text-orange-400",
  red: "text-red-700 dark:text-red-400",
  rose: "text-rose-700 dark:text-rose-400",
  teal: "text-teal-700 dark:text-teal-400",
  violet: "text-violet-700 dark:text-violet-400",
}

export const appearanceSwatchClasses: Record<AppearancePaletteColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  green: "bg-green-500",
  indigo: "bg-indigo-500",
  lime: "bg-lime-500",
  neutral: "bg-neutral-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
}

export function resolveAppearanceColor(
  color: AppearanceColor | undefined
): AppearanceColor {
  return color ?? neutralAppearanceColor
}
