# Guri — gxuri.me/writings

Research record, not a locked decision. See `spec/research/design-craft/emil-kowalski.md` for the disclaimer.

More reference-style than opinion essays — a catalog of Tailwind utilities, and two Framer Motion explainer guides. Less "here's my philosophy," more "here's the toolbox." Treated accordingly below: noted what's already in use in this codebase, what's genuinely new, and what's a good idea for later (not urgent, no page exists yet to use it on).

---

## 1. Uncommon Tailwind CSS Classes

<https://www.gxuri.me/writings/uncommon-tailwindcss-classes>

A grab-bag of lesser-known utilities. Most of the selector mechanics here are **already established convention in this codebase**, which is worth confirming rather than assuming: named `group/name` and `peer` selectors are used throughout (`button.tsx`, `switch.tsx`, `tabs.tsx`, `sidebar.tsx`); descendant data-attribute targeting (`**:data-[slot=...]`) is used in `navigation-menu.tsx` and `tooltip.tsx`; bracket descendant selectors (`[&_svg]`) size icons everywhere. None of that is new — good confirmation the codebase is already using Tailwind's less-common surface where it's actually useful, not just the basics.

**What's genuinely not in use yet, worth remembering for later:**

- **Fluid typography via `text-[clamp(min,preferred,max)]`** — scales font size continuously with viewport width instead of stepping at breakpoints. No hero or large display type exists yet in this codebase (per `HANDOFF.md`, real page-building hasn't started), but the design-language research already flagged the hero headline as the single most important line on the homepage — this is the concrete utility to reach for when that gets built, instead of a stack of breakpoint-specific `text-*` overrides.
- **`nth-child` striping (`odd:`/`even:`)** — alternating row backgrounds with zero extra markup. Directly relevant to `table.tsx`, which exists in this codebase but has no striping behavior currently.
- **Animated underline via a `before:` pseudo-element scaled on hover** — a link-hover technique not currently used anywhere (nav links and footer links here use plain `hover:bg-muted`/`hover:underline`, not an animated underline sweep). Worth a look if a more editorial-feeling link treatment is wanted later.
- **A dev-only breakpoint indicator component** (shows the active Tailwind breakpoint in a corner badge, stripped from production builds). This is the most concretely actionable idea in the whole post — a real, buildable dev tool, not a taste opinion. This project already has a `TanStackDevtools` panel wired into `__root.tsx`; a breakpoint indicator would slot into the same "dev-only, invisible in production" category. Worth flagging as a small, self-contained thing to build once real responsive page layouts exist to verify.

## 2. Framer Motion Timeline Guide

<https://www.gxuri.me/writings/framer-motion-timeline-guide>

Explains `useAnimate` (multiple elements, scoped by selector) vs `useAnimation` (single element, imperative control), with a clean decision rule: one element → `useAnimation`, multiple → `useAnimate`. Neither is used in this codebase yet — the only imperative Motion usage so far is the bare `animate()` function call on a single ref in `switch.tsx`'s press feedback, which is the right tool for that specific single-element case per his own rule.

Worth remembering for later: if a future component needs a genuinely staged, multi-element sequence (a multi-step success confirmation, a staggered reveal that isn't just CSS `animation-delay`), `useAnimate` is the documented tool for it, not a hand-rolled chain of `setTimeout`s or multiple independent `animate()` calls.

One thing worth explicit approval, not just noting: the author argues *for* explicit `async`/`await` sequencing over "complex timing logic with hooks like `useEffect`" — same direction as this project's `no-useEffect` skill, not in tension with it. If `useAnimate`/`useAnimation` get used later, the sequencing itself belongs in an event handler or a plain async function, not wrapped in an effect to "run once."

## 3. Learn Spring Motion

<https://www.gxuri.me/writings/learn-spring-motion>

A clear explainer of the three spring parameters, with analogies worth keeping for anyone tuning these values later without re-deriving intuition from scratch: **stiffness** is a rubber band (tighter = faster snap-back), **damping** is the ball's weight (heavier = less bounce), **mass** is inertia (heavier = slower to start moving). His working default: `stiffness: 300, damping: 30, mass: 0.2` — "snappy and smooth."

**The rule that matters most, and it validates every spring choice made this session without exception**: use springs for pointer-driven interaction (hover, click, drag) where responsiveness matters; use duration-based `ease-out` for dialogs, where a consistent, predictable duration matters more than physical responsiveness.

Checked against what's actually shipped so far:
- `tabs.tsx` active-highlight — hover/click-driven → spring (`duration: 0.25, bounce: 0.15`, Apple's API variant of the same physics). Matches.
- `shared-layout-background.tsx` — hover-driven → spring (`stiffness: 205, damping: 22`). Matches.
- `switch.tsx` press feedback — click/press-driven → spring (`stiffness: 500, damping: 30`). Matches.
- Dialogs, sheets, alert-dialogs in this codebase use duration-based transitions (Base UI's `data-starting-style`/`data-ending-style` with fixed `duration-300`-class timing), not springs. Matches his rule on the other side too.

No corrections needed here — this post is confirmation that the spring-vs-duration split already happening in this codebase (without it being written down anywhere as a rule) is the same split he argues for explicitly. Worth writing down now that it's been independently validated twice (Rauno's prototype writeup didn't touch this specifically, but nothing in any of the three authors so far contradicts it): **springs for anything the user's pointer is directly driving, fixed duration + ease-out for anything that opens/closes as a discrete event (dialogs, sheets).**
