"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react"

import { type Theme } from "@/components/providers/theme-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const options: ReadonlyArray<{
  value: Theme
  Icon: typeof SunIcon
  label: string
}> = [
  { value: "system", Icon: MonitorIcon, label: "System" },
  { value: "light", Icon: SunIcon, label: "Light" },
  { value: "dark", Icon: MoonIcon, label: "Dark" },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      aria-label="Theme"
      className={cn(
        "inline-flex h-8 items-center rounded-full border border-dotted px-1",
        className
      )}
      data-slot="theme-toggle"
      role="group"
    >
      {options.map(({ value, Icon, label }) => {
        const isSelected = theme === value

        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={isSelected}
            className={cn(
              "size-6 rounded-full text-muted-foreground transition-[scale,color] duration-150 ease-out-strong outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-97",
              isSelected && "bg-muted text-foreground"
            )}
            onClick={() => setTheme(value)}
          >
            <Icon aria-hidden="true" className="m-auto size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
