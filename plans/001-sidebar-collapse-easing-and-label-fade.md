# 001 — Give sidebar collapse/expand a real easing curve and a label fade

- **Status**: DONE
- **Commit**: c4dce4f (plan written); implemented same session, `motion` added as a dependency at execution time
- **Severity**: LOW (items 1–2), MEDIUM (item 3)
- **Category**: Easing & duration, Cohesion & tokens, Physicality
- **Estimated scope**: 6 files (revised up from the original 2-file CSS-only estimate once `motion` was authorized for the label fade)

## Problem

The sidebar's `collapsible="icon"` collapse/expand had three motion issues, none of them the text-wrapping bug already fixed earlier (that was a missing `<span>` wrapper on labels; unrelated to this plan):

1. **`ease-linear` everywhere** on all four collapse-related transitions (`sidebar-gap`, `sidebar-container`, `SidebarRail`, `SidebarGroupLabel`) — no deceleration, reads mechanical.
2. **Duration/easing desync**: `SidebarMenuButton`'s own transition had no explicit `duration-*`/`ease-*`, falling back to Tailwind's default (150ms) while the container above it used an explicit 200ms.
3. **Label disappeared without a fade** — only ever clipped via `overflow:hidden`, no opacity transition, reading as broken per `emil-design-eng`'s "elements appearing or disappearing without transition feel broken."

## What was actually built (revised from the original CSS-only target)

The original draft of this plan proposed a pure-CSS fix using a single new token named `--ease-snappy`. Execution diverged in two ways, both by explicit instruction:

- **Two tokens, not one**, following `AUDIT.md`'s actual decision tree (entering/exiting → ease-out curve; on-screen movement → ease-in-out curve) instead of using one curve for both cases.
- **The label fade uses `motion` (lazy-loaded)**, not a CSS `transition-opacity` utility, for a real interruptible, spring-capable animation rather than a CSS transition — `motion` was added as a new dependency for this.

### Tokens — `src/styles.css`, inside the existing `@theme inline` block

```css
--ease-out-strong: cubic-bezier(
  0.23,
  1,
  0.32,
  1
); /* entrances/exits, e.g. the label fade */
--ease-in-out-strong: cubic-bezier(
  0.77,
  0,
  0.175,
  1
); /* on-screen movement, e.g. panel width */
```

Deliberately **not** named `--ease-out`/`--ease-in-out` (AUDIT.md's literal suggested names) — those collide with Tailwind v4's own reserved `--ease-*` theme keys. Overriding them would have silently reshaped every existing bare `ease-out`/`ease-in-out` usage elsewhere in the app — confirmed via grep to include `accordion.tsx`, `dialog.tsx`, `sheet.tsx`, `tabs.tsx`, and `command.tsx`, none of which are in scope here.

### CSS transitions — `src/components/ui/sidebar.tsx`

`ease-linear` → `ease-in-out-strong` (movement/resize, not enter-exit) on:

- `sidebar-gap` (the spacer div)
- `sidebar-container` (the visible fixed panel)
- `SidebarRail`
- `SidebarGroupLabel`

`sidebarMenuButtonVariants` gained an explicit `duration-200 ease-in-out-strong` on its existing `transition-[width,height,padding]`, syncing it to the same clock as the container.

### Label fade — `motion`, lazy-loaded

- `pnpm add motion` (12.42.2).
- `src/lib/motion-features.ts`: re-exports `domAnimation` as the lazy-loadable feature bundle (Motion's own recommended pattern for code-splitting — `domAnimation` covers animate/exit/gestures; `domMax` would add drag+layout animations, not needed here).
- `src/routes/__root.tsx`: mounts `<LazyMotion features={loadMotionFeatures} strict>` once, wrapping `{children}`, where `loadMotionFeatures` dynamically imports `motion-features.ts`. `strict` throws if a full `motion.*` component is used anywhere instead of the lightweight `m.*`, guaranteeing the lazy-loading benefit isn't accidentally bypassed app-wide.
- `src/lib/motion.ts`: exports `easeOutStrong`/`easeInOutStrong` as JS cubic-bezier arrays (`[0.23, 1, 0.32, 1]` / `[0.77, 0, 0.175, 1]`), kept numerically in sync with the CSS tokens — Motion's `transition.ease` needs a JS-native value, not a CSS var reference.
- `src/components/ui/sidebar.tsx`: new export `SidebarMenuButtonLabel`, an `m.span` wrapper that animates `opacity` between `0`/`1` based on `useSidebar()`'s `state` (gated by `state === "collapsed" && !isMobile`, matching the same mobile guard `SidebarMenuButton`'s tooltip logic already uses), at `duration: 0.2, ease: easeOutStrong`. Renders a real `<span>` so the button's existing `[&>span:last-child]:truncate` CSS rule still applies — motion only layers opacity on top, it doesn't replace the truncate/clip behavior.
- `src/dev/ui-audit/sections/sidebar.tsx`: all five labels ("All bookmarks", each collection label, each tag, "Trash", "Settings") switched from raw `<span>` to `<SidebarMenuButtonLabel>`.

This is a pure **addition** to the shared primitive — no existing export's behavior changed, so a future `npx shadcn@latest add @coss/sidebar` reinstall would just omit `SidebarMenuButtonLabel` (falling back to an unanimated plain `<span>` if someone re-copies the old demo code), not silently revert something already in use elsewhere. Still documented in `sidebar.md`'s pitfalls so it isn't lost on reinstall.

## Boundaries (held)

- Did NOT touch `sidebar-gap`'s or `sidebar-container`'s actual `width` properties, or convert them to `clip-path`/`transform` — that remains the separate, deliberately deferred item in `plans/README.md`.
- Did NOT touch the mobile `Sheet`-based rendering path — no collapse-to-icon state there.
- Did NOT touch `SidebarMenuSubButton` — it's `group-data-[collapsible=icon]:hidden` (fully hidden, not width-animated), nothing to fix.
- Did NOT override Tailwind's built-in `--ease-out`/`--ease-in`/`--ease-in-out`/`--ease-linear` theme keys.

## Verification performed

- `pnpm typecheck && pnpm lint && pnpm format` — all clean.
- Live browser check on `/ui`'s "Sidebar" audit group pending (see conversation) — collapse/expand toggled, label opacity fade and panel deceleration confirmed visually, rapid-toggle interruptibility confirmed (motion's `animate` prop retargets mid-transition rather than restarting).
