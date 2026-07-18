# Raphael Salaja — raphaelsalaja.com/library, userinterface.wiki

Research record, not a locked decision. See `spec/research/design-craft/emil-kowalski.md` for the disclaimer.

Worth noting up front: this is the same author behind `@web-kits/audio`, the sound library already wired into this codebase's primitives, and its "Minimal" sound patch. His writing on secondary action (post 2, below) directly explains the reasoning behind a system this project already ships. (Correction, 2026-07-18: an earlier draft listed the specific wired files as `button.tsx`/`checkbox.tsx`/`switch.tsx`/`toggle.tsx`/`toggle-group.tsx`/`radio-group.tsx`/`sonner.tsx`. Verified: `button.tsx`, `checkbox.tsx`, `switch.tsx`, `toggle.tsx`, and `radio-group.tsx` do call `useSound` directly. `toggle-group.tsx` does not — it renders Base UI's own primitive directly rather than the sound-wired `Toggle` component. There is no `sonner.tsx` in this codebase; the toast component is `toast.tsx`, which does have its own sound wiring, keyed by toast type.)

Eight posts, the densest and most technically concrete batch so far — several genuinely new, implementable techniques, not just restated taste philosophy.

---

## 1. The Concept of Taste

<https://www.raphaelsalaja.com/library/the-concept-of-taste>

Third author now making the same core claim independently: taste is a learnable skill, not innate preference. His framing draws on Hume (taste develops through exposure and education), Kant (personal taste guided by universal principles — harmony, balance), and Bourdieu (a sharper, more cynical note the other authors don't raise: taste also functions as a marker of social distinction, not purely aesthetic judgment). His flattest claim: **"Anyone who says taste can't be taught is lying."**

His caveat is the useful part, not the thesis: he warns against chasing novelty for its own sake, and notes digital platforms now accelerate aesthetic cycles — trends move faster than they used to, which raises the bar for distinguishing "genuinely better" from "just different because it's new." Use it as a check against copying a technique from this research folder just because it is novel, separate from whether it is actually right for Reway.

## 2. 12 Principles of Animation

<https://www.raphaelsalaja.com/library/12-principles-of-animation>

Disney's classic 12 principles, mapped to UI. Several are already established in this codebase's conventions or the loaded skills; noting only what's confirmed vs. genuinely new.

**Already covered / confirmed:**
- Slow In & Slow Out → easing basics, already in `emil-design-eng`.
- Follow Through & Overlapping Action → staggered list entry with per-item delay, matches the stagger-animation guidance already in `make-interfaces-feel-better` (30–80ms between items).
- Timing → sub-300ms rule, already established project-wide.

**Genuinely new, worth remembering:**
- **Anticipation** — a subtle pre-action cue before something significant happens (his example: a notification icon that "wiggles gently to imply updates awaiting"). Explicit caution attached: reserve for important moments, overusing it on minor interactions reads as gimmicky. Nothing in this codebase currently does this; worth considering for something like an unread-count badge later, not urgent.
- **Staging** — sequencing *which part* of a multi-part interaction animates first, not just staggering a list: backdrop fades in, then the panel slides, then the primary control gets focus/highlight. Different from stagger (which repeats the same motion across siblings) — this is about ordering *different* motions across a single interaction's parts. Worth checking against `dialog.tsx`/`sheet.tsx` later: do backdrop and panel currently animate together or staged?
- **Arcs** — curved rather than linear motion paths, for a more organic feel on larger transitions. Not used anywhere in this codebase. His own guidance: keep subtle, requires real experimentation to get right, not a drop-in utility class.
- **Secondary Action** — small flourishes supporting a primary action, explicitly including **sound**: "subtle clicks or whooshes reinforce interaction feelings." This is the exact justification for the `@web-kits/audio` wiring already done this session (button clicks, checkbox/switch/toggle sounds, toast sounds) — good to have the author's own reasoning on record for *why* that work was worth doing, from the person who built the library.
- **Exaggeration** — deliberately amplifying motion beyond realism for moments that need to be *noticed*, not just felt: his example is an error-field wiggle, which communicates more forcefully than a color change alone. This codebase currently only uses `aria-invalid:border-destructive` color/ring changes for validation errors (`input.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `button.tsx`) — no motion. Worth considering as a future enhancement for form validation feedback specifically, not a general-purpose technique.
- **Solid Drawing** — using CSS `perspective` and consistent scale/skew/rotate handling to make flat UI read as occupying real depth. Not used anywhere in this codebase yet.

## 3. Laws of UX

<https://www.userinterface.wiki/laws-of-ux>

- **Fitts's Law** — target acquisition time is a function of size and distance. His stated application is, almost word for word, a technique already shipped in this codebase: **"expand button hit areas using invisible padding via `::before`/`::after` pseudo-elements."** Verified citation (corrected 2026-07-18 — an earlier draft named the wrong files): `button.tsx`, `toggle.tsx`, `select.tsx`, `combobox.tsx`, `sidebar.tsx`, `number-field.tsx`, `autocomplete.tsx`, and `badge.tsx` all do this via a `pointer-coarse:after:` pseudo-element. `checkbox.tsx`, `switch.tsx`, and `radio-group.tsx` do not currently use this pattern. Good to have the formal name and reasoning for a technique this codebase already applies, now attached to the right files.
- **Hick's Law** — decision time scales (worse than linearly) with the number of choices. His recommended mitigation, progressive disclosure, is already a stated project rule in `CLAUDE.md`'s Audience & UX Contract ("progressive disclosure — don't show everything at once"). Confirmation, not new information.
- **Miller's Law** — working memory holds about 7±2 items; chunk larger data accordingly (his example: phone numbers formatted in groups, not as one raw digit string). Not currently relevant to anything in this codebase, but worth remembering once any data-dense UI (tables, forms with many fields) gets built.
- **Doherty Threshold** — responses under **400ms** feel instantaneous; above it, users perceive a wait. This is a different number for a different thing than the sub-300ms *animation* rule already established — that rule is about how long a UI transition should take, this is about how fast a *system response* (an API call, a computation) needs to feel before it needs a loading affordance (optimistic UI, skeleton, progress indicator). Worth keeping both numbers straight: 300ms ceiling for animations, 400ms ceiling before a response needs its own feedback mechanism.
- **Postel's Law** — "be conservative in what you send, be liberal in what you accept." Applied to UI: accept messy human input (multiple date formats, for instance), normalize and validate it internally, but keep output/formatting strict and consistent. Relevant to future form/input work, nothing to action now.

## 4. Animating Container Bounds

<https://www.userinterface.wiki/animating-container-bounds>

A concrete, genuinely new technique: browsers can't natively animate `width`/`height` (they don't interpolate), so the pattern is an **outer container animated by Motion, with an inner element measured via a `useMeasure` hook built on `ResizeObserver`**. The ref goes on the inner content being measured; Motion's `animate` targets the outer container with those measured dimensions. This is what makes a button smoothly resize when its label changes, or an accordion slide open instead of snapping.

Two real caveats worth remembering if this ever gets built here: **guard the initial render** — measured bounds default to `0`, so the pattern needs something like `bounds.height > 0 ? bounds.height : "auto"` to avoid animating from zero on first mount; and **never put the measuring ref and the `animate` target on the same element** — that creates a measurement feedback loop. His explicit closing note: use this sparingly, it's a specific-problem tool, not a default.

Directly relevant to `accordion.tsx`, which already exists in this codebase — worth checking later whether Base UI's own accordion height animation already handles this correctly, or whether this pattern would improve it.

## 5. Morphing Icons

<https://www.userinterface.wiki/morphing-icons>

A constraint-based technique: build every icon from exactly three SVG lines, collapsing unused lines to invisible points for simpler icons, so any two icons in the set share the same structural skeleton and can morph into each other without per-pair custom logic. Credited by the author as inspired by someone else's experiment, and the fetched content is thin on implementation detail — noting this as an idea worth knowing exists, not something with enough detail here to implement. Also a bigger investment than anything else in this batch: this project uses Phosphor's full fixed icon set, not custom-drawn icons, so adopting this would mean redrawing icons from scratch, not a drop-in technique.

## 6. Mastering Animate Presence

<https://www.userinterface.wiki/mastering-animate-presence>

Technical reference for Motion's `AnimatePresence`. **Correction (2026-07-18): an earlier draft claimed `tabs.tsx` and `shared-layout-background.tsx` already used this, via a `custom` prop. `tabs.tsx`'s indicator is plain CSS, and `shared-layout-background.tsx` doesn't exist.** The real current usage is `animated-icon.tsx` (built later, after this file was originally written), with `mode="popLayout"` and `initial={false}` — not the `custom` prop. Worth having the fuller API on record regardless, since more of it may get used later:

- **`useIsPresent`** — lets a child know it's mid-exit (e.g. to disable interaction on something that's leaving). Must be called from a component that is itself a child of `AnimatePresence`, not inlined in the parent.
- **`usePresence`** — manual exit control via a `safeToRemove()` callback, for coordinating async cleanup or an external animation library before actual unmount.
- **`propagate` prop** — makes exit animations cascade into nested `AnimatePresence` children instead of those children just vanishing instantly. Not currently relevant to anything in this codebase.
- **`mode` prop** — `sync` (default, simultaneous), `wait` (sequential — the author notes this roughly doubles perceived duration since nothing overlaps), `popLayout` (removes exiting elements from layout flow immediately via absolute positioning, so siblings don't wait for an exit animation to finish before reflowing — this is the mode `animated-icon.tsx` actually uses).

His recommendation on when to reach for `AnimatePresence` at all vs. the simpler CSS `@starting-style` approach already used elsewhere in this codebase (`tooltip.tsx`, `navigation-menu.tsx`): use `AnimatePresence` specifically when you need presence-state *reading*, manual exit control, direction-awareness, or coordinated nested exits — not by default for every enter/exit.

## 7. To Spring or Not to Spring

<https://www.userinterface.wiki/to-spring-or-not-to-spring>

The sharpest version yet of a rule that's now been independently stated by three different sources in this research folder. His framing is better than anything captured so far and worth using as the canonical phrasing going forward: **"is this motion reacting to the user, or is it the system speaking?"**

- Motion reacting to the user, must survive interruption (drag, flick, gesture) → **spring**.
- The system announcing a change or directing attention → **easing curve** (`ease-out` for entrances/feedback, `linear` for time-based progress).
- High-frequency interaction where motion reads as latency (typing, keyboard nav) → **no animation at all**.

Technical distinction worth keeping: "easing curves have a predefined start and end in time, whereas springs do not" — springs adapt continuously to changing input, easing curves assume the interaction is already complete before they start. His nuance: springs can feel "restless or overactive" for a simple state announcement, and overused ease-in-out reads as "sluggish and overly polite." His closing line is worth keeping as a check against dogma: duration matters more than curve shape for most sluggishness complaints, and ultimately "what matters most is that the interaction feels right."

**Correction (2026-07-18): an earlier draft claimed this was "checked against this session's actual choices," citing `tabs.tsx`, `shared-layout-background.tsx`, and `switch.tsx` press feedback as pointer-driven springs. None of the three are springs — `tabs.tsx` and `switch.tsx` are plain CSS transitions, and `shared-layout-background.tsx` doesn't exist.** Dialogs/sheets genuinely are duration-based system-announced transitions, so that half of the comparison holds. The spring-vs-duration split itself remains the most corroborated single principle across this whole research folder (independently stated by Guri and Rauno Freiberg too) — it just isn't demonstrated by real spring usage in this codebase yet, since no pointer-driven Motion interaction has been built here.

## 8. Taking Advantage of Pseudo-Elements

<https://www.userinterface.wiki/taking-advantage-of-pseudo-elements>

Two techniques, one already validated by this codebase's conventions, one genuinely new:

- **`::before`/`::after` for hover feedback layers**: his example animates a button's `::before` from `scale(0.95)`/`opacity: 0` to `scale(1)`/`opacity: 1` on hover — the same "never scale from 0" principle already in `make-interfaces-feel-better`, applied to a *pseudo-element hover background* rather than a real DOM node. Worth noting as a lighter-weight alternative for a **single, non-shared** hover-background effect. It's a different tool from a Motion `layoutId` shared-layout animation (a highlight that moves *between* several elements, which needs a real React-managed DOM node to track, not a pseudo-element) — no such shared-layout component currently exists in this codebase (one was prototyped, then fully reverted, before this note was written), but the distinction is worth keeping if one gets built again later.
- **View Transitions API** (`view-transition-name`) — a native browser mechanism for morphing between DOM states (his example: a thumbnail expanding into a lightbox) without a JS animation library or manual element cloning; the browser interpolates position/size/style automatically. This is modern and genuinely new to this research folder — not currently used anywhere in this codebase. Worth investigating browser support and SSR/hydration implications before treating it as adoptable, but worth remembering specifically for a future lightbox/image-detail feature, where it would remove a real chunk of animation-library code.
