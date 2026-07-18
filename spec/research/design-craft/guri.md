# Guri — gxuri.me/writings

Research record, not a locked decision. See `spec/research/design-craft/emil-kowalski.md` for the disclaimer.

More reference-style than opinion essays — a catalog of Tailwind utilities, and two Framer Motion explainer guides. Less "here's my philosophy," more "here's the toolbox." Treated accordingly below: noted what's already in use in this codebase, what's genuinely new, and what's a good idea for later (not urgent, no page exists yet to use it on).

---

## 1. Uncommon Tailwind CSS Classes

<https://www.gxuri.me/writings/uncommon-tailwindcss-classes>

A grab-bag of lesser-known utilities. Bracket descendant selectors (`[&_svg]`) genuinely do size icons everywhere in this codebase — confirmed, no correction needed there. **Correction (2026-07-18): the other two citations in an earlier draft of this note were wrong.** Descendant data-attribute targeting via bracket selectors (`[data-slot=...]`, `*:data-[slot=...]`, `has-[[data-slot=...]]`) is a real, widespread convention — but in `card.tsx`, `autocomplete.tsx`, `combobox.tsx`, and `alert.tsx`, not in `navigation-menu.tsx` or `tooltip.tsx` as originally claimed (grep-checked: zero `data-slot` bracket selectors in either file). Named `group/name`/`peer` selector usage in `switch.tsx`/`tabs.tsx`/`sidebar.tsx` specifically wasn't re-confirmed and shouldn't be assumed from the earlier draft either — worth a fresh check before citing specific files again.

**What's genuinely not in use yet, worth remembering for later:**

- **Fluid typography via `text-[clamp(min,preferred,max)]`** — scales font size continuously with viewport width instead of stepping at breakpoints. No hero or large display type exists yet in this codebase (per `HANDOFF.md`, real page-building hasn't started), but the design-language research already flagged the hero headline as the single most important line on the homepage — this is the concrete utility to reach for when that gets built, instead of a stack of breakpoint-specific `text-*` overrides.
- **`nth-child` striping (`odd:`/`even:`)** — alternating row backgrounds with zero extra markup. Directly relevant to `table.tsx`, which exists in this codebase but has no striping behavior currently.
- **Animated underline via a `before:` pseudo-element scaled on hover** — a link-hover technique not currently used anywhere. No real nav or footer pages exist yet to check current link styling against (real page-building hasn't started, per `HANDOFF.md`) — worth a look once one does, if a more editorial-feeling link treatment is wanted.
- **A dev-only breakpoint indicator component** (shows the active Tailwind breakpoint in a corner badge, stripped from production builds). This is the most concretely actionable idea in the whole post — a real, buildable dev tool, not a taste opinion. This project already has a `TanStackDevtools` panel wired into `__root.tsx`; a breakpoint indicator would slot into the same "dev-only, invisible in production" category. Worth flagging as a small, self-contained thing to build once real responsive page layouts exist to verify.

## 2. Framer Motion Timeline Guide

<https://www.gxuri.me/writings/framer-motion-timeline-guide>

Explains `useAnimate` (multiple elements, scoped by selector) vs `useAnimation` (single element, imperative control), with a clean decision rule: one element → `useAnimation`, multiple → `useAnimate`. Neither is used in this codebase. **Correction (2026-07-18): an earlier draft claimed `switch.tsx`'s press feedback was an imperative `animate()` ref call — it's actually pure CSS, no Motion involved at all.** The only real Motion usage in this codebase currently is declarative: `AnimatePresence` + the `m` component in `animated-icon.tsx` (built after this research file was originally written), not an imperative `animate()`/`useAnimate` call anywhere.

Worth remembering for later: if a future component needs a genuinely staged, multi-element sequence (a multi-step success confirmation, a staggered reveal that isn't just CSS `animation-delay`), `useAnimate` is the documented tool for it, not a hand-rolled chain of `setTimeout`s or multiple independent `animate()` calls.

One thing worth explicit approval, not just noting: the author argues *for* explicit `async`/`await` sequencing over "complex timing logic with hooks like `useEffect`" — same direction as this project's `no-useEffect` skill, not in tension with it. If `useAnimate`/`useAnimation` get used later, the sequencing itself belongs in an event handler or a plain async function, not wrapped in an effect to "run once."

## 3. Learn Spring Motion

<https://www.gxuri.me/writings/learn-spring-motion>

A clear explainer of the three spring parameters, with analogies worth keeping for anyone tuning these values later without re-deriving intuition from scratch: **stiffness** is a rubber band (tighter = faster snap-back), **damping** is the ball's weight (heavier = less bounce), **mass** is inertia (heavier = slower to start moving). His working default: `stiffness: 300, damping: 30, mass: 0.2` — "snappy and smooth."

**The rule that matters most**: use springs for pointer-driven interaction (hover, click, drag) where responsiveness matters; use duration-based `ease-out` for dialogs, where a consistent, predictable duration matters more than physical responsiveness.

**Correction (2026-07-18): an earlier draft of this note claimed this split was "validated against every spring choice actually shipped this session," citing `tabs.tsx`, `shared-layout-background.tsx`, and `switch.tsx` as spring-based examples. None of that holds up against the real code:**
- `tabs.tsx`'s active-highlight indicator is a plain CSS transition (`transition-[width,translate] duration-200 ease-in-out`) — no spring, no Motion.
- `shared-layout-background.tsx` doesn't exist — it was prototyped, then fully reverted per an explicit rejection, before this research file was written.
- `switch.tsx`'s press feedback is pure CSS (`scale-x-110` on `:active`), not a spring.
- Dialogs/sheets/alert-dialogs genuinely **do** use duration-based transitions (Base UI's `data-starting-style`/`data-ending-style` with fixed-duration timing) — that half of the claim is accurate.

The underlying principle is still worth keeping as prospective guidance, now independently corroborated by Raphael Salaja's "To Spring or Not to Spring" and Guri's own working spring defaults above: **springs for anything the user's pointer is directly driving, fixed duration + ease-out for anything that opens/closes as a discrete event (dialogs, sheets)** — apply it the next time a pointer-driven interaction actually gets built, rather than treating it as something already demonstrated here.
