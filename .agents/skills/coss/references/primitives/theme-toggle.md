# ThemeToggle

## When to use

- A visible, clickable light/dark/system theme control (settings page, header). Complements the global "D" keyboard shortcut (`ThemeProvider`'s `useHotkey("D", ...)`) rather than replacing it — the hotkey stays keyboard-only and never animates (per this project's Animation Rules), the toggle is the discoverable UI affordance for the same underlying state.

**Not a coss primitive.** coss ui ships no theme-toggle component. This is a small project-original component (`src/components/ui/theme-toggle.tsx`) — a plain three-button segmented control, not built on coss's `Toggle`/`ToggleGroup` primitives (it needed three simultaneous-option semantics — light/dark/system — rather than `ToggleGroup`'s pressed/unpressed model).

## Install

No registry entry. Copy `src/components/ui/theme-toggle.tsx` directly. Depends on `@/components/providers/theme-provider` (the `Theme` type and `ThemeProvider` context) and `@/hooks/use-theme` (the `useTheme()` consumer hook) — both must exist in the target project.

## Canonical imports

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle"
```

## Minimal pattern

```tsx
<ThemeToggle />
```

No props beyond an optional `className` — state comes entirely from `useTheme()` internally.

## Common pitfalls

- **Three-way, not binary.** Unlike a typical dark-mode switch, this control has three mutually exclusive options (`light`/`dark`/`system`), each its own `<button aria-pressed>`, not a single toggle. Don't collapse it to two options without also reconsidering whether `system` (OS-driven) theme support is still wanted — `theme-store.ts` already supports it fully (SSR-safe, cross-tab synced via a `storage` listener and a `matchMedia` change listener).
- **Press feedback matches the project's other pressable controls.** `active:scale-97` + `transition-[scale,color] duration-150 ease-out-strong`, same values as `button.tsx`/`toggle.tsx`/`checkbox.tsx` — kept consistent deliberately, don't drift to a different duration/easing here.
- **Icon set is fixed to three:** `MonitorIcon` (system), `SunIcon` (light), `MoonIcon` (dark), from `@phosphor-icons/react`. If the icon library ever changes project-wide, update all three here, not just the ones that happen to look wrong.
