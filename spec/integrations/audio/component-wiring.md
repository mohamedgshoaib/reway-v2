# Component wiring

Sound triggers live in the shared component, not in page code — matches the existing rule to fix UI behavior at the `src/components/ui/*` root rather than per-page overrides. Any page using these components gets sound for free.

## Wired this pass

| Component | File | Trigger | Sound |
| --- | --- | --- | --- |
| Button | `src/components/ui/button.tsx` | `onClick` | `click` |
| Checkbox | `src/components/ui/checkbox.tsx` | `onCheckedChange` | `checkbox` |
| Switch | `src/components/ui/switch.tsx` | `onCheckedChange` | `toggle-on` / `toggle-off` (depending on new state) |
| Tabs | `src/components/ui/tabs.tsx` | `onValueChange` | `tab-switch` |
| Toaster | `src/components/ui/sonner.tsx` | wrapped `toast.success/error/warning/info` | `success` / `error` / `warning` / `info` |

Each wraps the existing callback prop rather than replacing it — consumer-supplied `onClick`/`onCheckedChange`/`onValueChange` still fire after the sound plays.

## Deferred (not wired this pass)

`accordion`, `collapsible`, `dialog`, `alert-dialog`, `drawer`, `sheet`, `dropdown-menu`, `tooltip`, `input`, `textarea`, and the rest of `src/components/ui/*`. No decision against wiring these — just out of scope for this pass. Revisit deliberately, don't wire opportunistically.

## Hover: excluded on purpose

The Minimal patch includes a `hover` sound, but nothing plays it. Hover fires on passive mouse movement, not a deliberate action — every other wired sound fires on a deliberate click/toggle/submit. A hover sound is a classic way for a UI to turn grating fast, and it does not fit Reway's calm, non-intrusive product experience (see `spec/identity/project-dna.md`). Only reconsider this for a specific future feature with a concrete case for it, not as a default.

## Why `sonner.tsx` needed a different approach

`useSound` (the hook every other component above uses) only works inside a React component render — it reads `enabled`/`volume`/reduced-motion from React context. But `sonner`'s `toast.success()` etc. are a global singleton, callable from anywhere: components, route loaders, async callbacks, not just render. Forcing toasts through a hook (`useToast()`) would mean every future call site has to be inside a component just to get sound-wrapped toast functions — a bigger ergonomic change than this pass, and one that fights how `sonner` is meant to be used.

Instead, `sonner.tsx` exports a `toast` wrapper that stays callable from anywhere exactly like the original:

```ts
import { toast } from "@/components/ui/sonner" // not "sonner" directly
toast.success("Saved")
```

It reads `enabled`/`volume` from `localStorage` directly (`src/lib/sound-settings.ts`) and checks `prefers-reduced-motion` itself via `matchMedia`, then calls the library's non-hook `defineSound()`. This duplicates the same ~2-line gate that `useSound` does internally, but only in this one file — it was judged worth it to keep `toast()` callable from anywhere. All other `sonner` methods (`dismiss`, `promise`, `loading`, `custom`, `message`, the base callable) pass through untouched via `Object.assign`.

**Any future code that wants sound-wrapped toasts must import `toast` from `@/components/ui/sonner`, not from `sonner` directly.** Importing from `sonner` still works but silently skips the sound.
