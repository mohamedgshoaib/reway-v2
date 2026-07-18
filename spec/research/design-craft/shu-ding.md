# Shu Ding — shud.in/thoughts

Research record, not a locked decision. See `spec/research/design-craft/emil-kowalski.md` for the disclaimer.

Different profile than the previous four sources: a React/Next.js core engineer (SSR, streaming, framework internals), not primarily an animation/interaction specialist. Several posts here validate specific architectural choices already made in this codebase, from someone who works on the framework internals those choices depend on — and one post surfaces a real caveat against something already shipped this session.

---

## 1. Build Bulletproof React Components

<https://shud.in/thoughts/build-bulletproof-react-components>

Core argument: components fail once they leave controlled conditions — SSR, hydration, multiple instances, portals, concurrent rendering — and "these weren't fragile, they were built for yesterday's React." Several of his listed patterns are **already correctly in place in this codebase**, worth confirming explicitly rather than assuming:

- **Inline pre-paint script to prevent hydration flash** — his recommended fix for server/client divergence (e.g. theme) is exactly `ThemeScript` in `__root.tsx`, which sets the theme class before React hydrates.
- **`useId` for instance uniqueness** — **correction (2026-07-18): an earlier draft claimed this was "already used throughout," citing `SharedLayoutBackground`'s `layoutId` namespacing, `tabs.tsx`, and the tooltip demo's handle. Checked against the real code: `useId` currently appears in exactly one file (`number-field.tsx`).** `SharedLayoutBackground` doesn't exist; `tabs.tsx` doesn't use `useId`; the tooltip demo's "handle" is a Base UI `createHandle()` mechanism, a different thing entirely from React's `useId`. The pattern itself is still good practice, just not the "already established, widely-used" convention it was described as.
- **Server-safe browser API access** — he recommends guarding `localStorage` reads behind `useEffect` to avoid an SSR crash. This project's `sound-settings.ts`/`sound-provider.tsx` actually does better than his described fix: it uses `useSyncExternalStore(subscribeToSoundSettings, getSoundEnabled, getDefaultSoundEnabled)`, where the third argument is the SSR-safe server snapshot. That avoids both the SSR crash *and* the hydration-flash his `useEffect` approach would still cause (the effect only runs after client paint, so there'd be one frame of default-state before the real value applies). Worth keeping `useSyncExternalStore` as the standing answer for "read a browser-only value safely," not the effect-guard he describes — also keeps it out of `no-useEffect` skill territory entirely.

A real caveat worth keeping regardless of any specific component: he warns against `React.cloneElement` for composition specifically because "children may be Promises or opaque references incompatible with cloning" in modern React (streaming, Server Components send children as references, not plain elements) — recommending Context instead. **Correction (2026-07-18): an earlier draft flagged this against `shared-layout-background.tsx`, described as "built entirely on `cloneElement`." That file doesn't exist — it was prototyped, then fully reverted, before this note was written.** The caveat itself is worth keeping for whenever a component using `cloneElement` actually gets built: TanStack Start's SSR model isn't React Server Components in the Next.js App Router sense, so the specific opaque-Promise-children failure mode is less likely to bite here today, but it's the first thing to check if a `cloneElement`-based component ever breaks in a way that doesn't make sense with children crossing an async/server boundary.

Other patterns noted for later, not yet relevant: `React.cache()` for server-side data-fetching dedup (no real data-fetching pages exist yet); `ownerDocument.defaultView` instead of global `window` for portal/iframe correctness (Base UI's own `Portal` components likely already handle this internally, worth checking if a future component ever needs a raw portal); `useState` over `useMemo` when a value needs *guaranteed* persistence, not just a performance hint — `useMemo` isn't a correctness guarantee in concurrent React.

## 2. Performance Is Not a Technical Problem

<https://shud.in/thoughts/performance-is-not-a-technical-problem>

Core claim: performance degrades not from bad code but from **entropy at scale** — no single engineer can hold a growing codebase's full context, and "context does not scale." His four production examples (a hook silently adding global listeners, a cache that silently breaks when extended, hidden async waterfalls, memoization applied without evidence it's needed) all share one root cause: nothing *enforced* the right pattern, so drift was inevitable. His conclusion: don't rely on engineer discipline — build systems that catch the mistake automatically, "systems that remember what humans forget."

This is a direct validation of the workflow already in place on this project, not a new idea to adopt — with one correction (2026-07-18) to be precise about what's actually automated versus available on demand: `pnpm check` runs lint, format-check, and typecheck together (verified against `package.json` — it does **not** currently run tests; `pnpm test` is a separate script, and CI correctly omits it too, since no test files exist yet). React Doctor and `/deslop` are both available tools this project has actually used to catch exactly this class of drift (see `plans/` and session logs for real invocations), but neither runs automatically on every change — they're invoked deliberately, not a CI gate (yet). Worth keeping as the stated *reason* these tools are worth reaching for, if that's ever questioned — just not overstating them as an automated safety net that already exists.

## 3. Good Design

<https://shud.in/thoughts/good-design>

Third instance of a theme now well-corroborated across sources (Emil's taste posts, Raphael Salaja's "Concept of Taste"): quality isn't proportional to complexity, and chasing yearly aesthetic trends is largely "artificial dissatisfaction with functional designs" rather than genuine improvement. His sharpest framing: trends are a **moving target** — designers reinvent the same concepts annually not to improve them, but to conform to that year's aesthetic, which manufactures a sense that last year's good work is now dated. Closes on Dieter Rams: "good design is timeless."

Directly relevant to Reway's stated posture: chase timeless fundamentals, not this year's trend. The project already favors calm, useful interfaces over novelty for its own sake; this source provides an independent rationale for maintaining that standard.

## 4. SSR Streaming and CSS-in-JS

<https://shud.in/thoughts/ssr-streaming-and-css-in-js>

Technical explainer: streaming SSR fundamentally conflicts with runtime CSS-in-JS, because collecting all styles for `<head>` requires the server to have already rendered the full `<body>` — but HTTP/HTML require `<head>` to be sent first, and streaming sends `<body>` incrementally. His workarounds (inline `<style>` tags scattered through `<body>`, synced to content reveals) come with real, stated costs: it violates the WHATWG spec placement rules, and the CSS can no longer be extracted as a separately cacheable file.

His own suggested alternative is directly relevant: **"static CSS files, or build-time collection tools like Tailwind CSS"** — collecting styles at build time sidesteps the whole runtime-ordering problem. This project already made that exact choice (Tailwind v4, no CSS-in-JS) on a stack that does SSR (TanStack Start). Worth having this as the explicit technical justification on record, from someone who works on streaming SSR internals and evaluated the tradeoff directly — this wasn't an arbitrary styling preference, it sidesteps a real architectural conflict this project would otherwise have to solve by hand.

## 5. On UI Animations

<https://shud.in/thoughts/on-ui-animations>

Splits animation into two categories with different rules: **style animations** (opacity, color, transform — should be subtle, and signal interactivity/state change) vs. **layout animations** (expand/collapse, reflow — should clarify structure, often need springs rather than CSS transitions).

**Independently confirms Raphael Salaja's "Animating Container Bounds" post from the previous batch, from a different angle**: he states plainly that CSS "cannot animate a property from fixed values like `0` to `auto`," so genuinely dynamic layout changes need a spring-based library paired with `ResizeObserver` — same problem, same general solution, stated by two different technical authors independently. Strengthens that as a real technique worth knowing, not a one-off trick.

He personally defaults to **`ease` with ~200ms duration** as a baseline, stored as a CSS custom property rather than repeated inline. **Correction (2026-07-18): an earlier draft of this note claimed this codebase had no shared duration/easing token. That's since changed** — `--ease-out-strong`/`--ease-in-out-strong` now exist in `styles.css`'s `@theme inline` block (added in `plans/001`, for entrances/exits and on-screen movement respectively), and `tooltip.tsx` deliberately reuses `navigation-menu.tsx`'s exact easing curve on purpose. His post is confirmation this was worth formalizing — already done, not still a "consider this later" item.

Two specific opinions worth keeping: he criticizes Material Design directly for "too many useless animations," and praises macOS/Stripe's toolbar menus for **not** re-fading content as the cursor moves between adjacent menu items — only animating at the boundary of entering or leaving the menu entirely. That's the exact same principle already built into `tooltip.tsx`'s instant-subsequent-hover pattern. (An earlier draft also attributed this to a `shared-layout-background.tsx` component's group-boundary fade behavior — that component doesn't exist; the tooltip pattern is the real, verified example.) Good to have this stated as a named, deliberate UX principle — it's the same rule Stripe and macOS apply, for the same reason.
