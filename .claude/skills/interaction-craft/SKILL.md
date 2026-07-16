---
name: interaction-craft
description: Interaction-design engineering knowledge distilled from Rauno Freiberg, Raphael Salaja, Guri, Shu Ding, Jakub Krehel, and dimi's production code (see spec/research/design-craft/). Covers ground make-interfaces-feel-better and emil-design-eng don't: the UX laws behind interaction decisions (Fitts, Hick, Miller, Doherty, Postel), animating layout/container size changes (width, height, expand-collapse) via ResizeObserver, the native View Transitions API, ambient/idle motion, staging multi-part interactions (backdrop/panel/focus sequencing), animation robustness under rapid re-triggering (interruptibility, cancel-and-restart), and gesture engineering (drag, pan, swipe thresholds, momentum vs. precision, motion-intensity judgment calls). Use this whenever building or reviewing drag/swipe/gesture interactions, hit-area or target-size decisions, anything that needs to animate to/from an unknown or dynamic size, a multi-part interaction (dialog/sheet/panel with a backdrop) where several things animate together, an interaction that can be rapidly re-triggered (fast hover in/out, repeated clicks, quick drags), idle/ambient motion for elements that should feel alive between interactions, or when deciding whether a gesture should preserve momentum or snap to exact positions. Do not use for border radius, shadows, typography, or basic enter/exit polish — that's make-interfaces-feel-better. Do not use for spring-vs-duration philosophy or taste development — that's emil-design-eng.
---

# Interaction Craft

Interaction engineering knowledge that sits one layer below `make-interfaces-feel-better` (surface polish) and `emil-design-eng` (animation philosophy) — this skill is about the mechanics of gestures, dynamic layout, and the research-backed reasons certain interaction patterns work. Consult those two skills first for anything about visual polish or the spring-vs-duration decision; this one picks up where they leave off.

Full source reasoning and links live in `spec/research/design-craft/` — this file is the distilled, actionable version.

## The UX laws behind interaction decisions

These aren't abstract theory — each one explains *why* a specific pattern already used in production interfaces works, which matters when a new situation doesn't map cleanly onto an existing example.

| Law | What it says | Apply it by |
| --- | --- | --- |
| **Fitts's Law** | Time to reach a target is a function of its size and distance, not just its visual size | The name behind why hit areas get extended at all — for the pseudo-element/40×40px mechanic itself, see `make-interfaces-feel-better`. The one thing that skill doesn't cover: when two controls sit close enough that pseudo-element extension on both would overlap into each other's hit area, use careful sibling sizing/spacing instead of extending each in isolation |
| **Hick's Law** | Decision time increases (worse than linearly) with the number of visible choices | Progressive disclosure — show the common path first, reveal complexity only on demand, don't present every option at once "just in case" |
| **Miller's Law** | Working memory holds about 7±2 items | Chunk dense data into meaningful groups (phone numbers as `415-867-5309`, not one raw string) rather than presenting it flat |
| **Doherty Threshold** | Responses under ~400ms feel instantaneous; above it, users perceive a wait | This is a *system response* budget, not an animation-duration budget — if a real operation (API call, computation) can't finish inside it, give it its own feedback (skeleton, optimistic UI, progress indicator) instead of letting the user stare at nothing |
| **Postel's Law** | Be liberal in what you accept, conservative in what you send | Parse messy human input generously (multiple date formats, inconsistent casing), but keep output formatting strict and consistent |

## Animating things CSS can't animate on its own

CSS cannot interpolate `height`/`width` to or from `auto`, and it cannot animate between two different fixed pixel values without you supplying both endpoints yourself. When a container needs to resize because its content changed (an accordion opening, a button whose label changed length, a card expanding to show more), reach for measure-then-animate:

**Check first whether the component primitive you're already using has this solved.** Many accessible component libraries (accordions especially) expose the measured height themselves via a CSS custom property or data attribute specifically so consumers don't have to reinvent measurement — building a parallel `ResizeObserver` setup on top of a primitive that already tracks this is wasted work and a second source of truth for the same value. Reach for the manual pattern below when you're not working through such a primitive, or when you've confirmed it doesn't expose what you need.

1. Measure the content that determines the size with a `ResizeObserver`-backed hook (a ref on the *inner* content, returning its live bounds).
2. Animate the *outer* container to that measured value with Motion, not the element being measured.

Two failure modes to avoid, both easy to hit by accident:

- **Never put the measuring ref and the `animate` target on the same element** — that creates a feedback loop where the animation changes the size, which changes the measurement, which changes the animation.
- **Guard the first render.** Measured bounds default to `0` before the `ResizeObserver` has fired once, so animating straight to that raw value causes a flash-to-zero on mount. Fall back to `"auto"` (or skip the animation entirely) until a real measurement exists: `bounds.height > 0 ? bounds.height : "auto"`.

Use this sparingly — it's a specific-problem tool for genuinely dynamic sizes, not a default wrapper for anything that changes shape.

## View Transitions for DOM-state morphing

The native `view-transition-name` CSS property lets the browser interpolate position, size, and style between two DOM states automatically (a thumbnail expanding into a full image, an element moving between two completely different layouts) without a JS animation library or manually cloning elements. Worth reaching for specifically when the alternative would be a decent amount of animation-library code to morph between two states that already exist in the DOM at different times. Check current browser support and how it interacts with hydration before relying on it in an SSR app — it's modern enough that this isn't a safe default yet everywhere.

## Ambient motion

Not every animation needs a trigger. Continuous, slow, subtle motion (a gentle float, a slow rotation) applied to elements that would otherwise sit dead-still between interactions makes a scene read as alive rather than frozen — distinct from interaction feedback, which responds to something the user did. Gate this behind `prefers-reduced-motion` exactly like every other animation; it has no functional purpose, so there's no reason to force it on someone who's opted out.

## Staging multi-step interactions

When one interaction has several visible parts (a backdrop, a panel, a control that gets focus), animate them in sequence, not all at once — backdrop first, then the panel, then whatever needs attention last. This is different from staggering a list (same motion, repeated across siblings with a small delay): staging is about ordering *different* motions across the parts of one interaction, so the user's attention is led through the sequence instead of everything happening simultaneously and competing for it. Worth checking any dialog, sheet, or command-palette-style interaction against this — a backdrop and its content animating in perfect lockstep is usually a missed opportunity, not a deliberate choice.

## Robustness under rapid re-triggering

An interaction that only works correctly the first time isn't finished. Hovering in and out quickly, clicking a button rapidly, or dragging back and forth should never leave an animation stuck, stacked, or fighting a newer one — the general bar is that interactions should be interruptible and, in the worst case, tolerate being spammed without breaking. Two concrete habits that get you there:

- **Explicitly stop in-flight animations before starting a new one on the same element(s)**, rather than letting a new trigger queue behind or fight whatever's still running. This matters most for anything hover-triggered or rapidly re-clickable.
- **Cancel an animation outright if a new update arrives faster than it can finish** (a reasonable default threshold is well under 200ms since the last one started) instead of letting it finish playing a now-stale transition before the next one can begin.

## Gesture engineering

- **Pan vs. tap**: a pointer needs to move roughly 3+ pixels before a gesture library should treat it as a pan/drag rather than a tap. Below that, it's noise from an imprecise touch or a shaky mouse, not intent.
- **Momentum vs. precision is a real decision, not a default.** Whether a drag/swipe gesture should preserve the pointer's actual velocity into its release (momentum) or ignore velocity and snap to the nearest fixed position (precision) depends entirely on what the gesture is for:
  - **No fixed destination** (a card being dismissed off-screen, a free-floating drag) → preserve momentum. It signals the system actually understood the specific gesture, not just that *a* dismiss happened. Kill momentum here and the interaction feels numb.
  - **Fixed destinations exist** (a swipe-to-reveal-actions row, anything that must land on an exact, reusable position afterward) → disable momentum, snap deliberately. A row landing 6px off its intended position because of leftover velocity isn't more "authentic," it's just broken — the revealed controls need to be reliably where the user expects them.
  - Don't default to one without checking which situation applies. Getting this backwards is the most common way a gesture interaction feels either sluggish (killing momentum where it was needed) or sloppy (preserving it where precision was required).
- **Match motion intensity to what the moment needs, not a fixed default.** Most feedback should be subtle — but a moment that genuinely needs to be *noticed*, not just felt (a validation error, a destructive-action confirmation), can deliberately amplify motion beyond what would normally look natural (an error field shaking, not just changing color) specifically because it communicates more forcefully than a static style change alone. Reserve this for moments that matter; applying it by default everywhere defeats the point and starts to feel cartoonish.
- **Progressive reveal thresholds**: when a drag interaction reveals actions/content in stages (first action, then a second, further along), give each stage its own distance threshold rather than one all-or-nothing reveal point — it lets a small, cautious drag preview intent before committing to the full gesture.
- **`useAnimate` for multi-element sequences, a plain `animate()` call for one element.** Motion's simple rule: one element being controlled imperatively → `useAnimation`/a direct `animate()` call on a ref; several elements that need to be orchestrated together, addressed by a shared selector → `useAnimate`, targeting elements via a data attribute (`[data-animate='thumb']`) rather than individual refs for each one.
- **Combining multiple animated transform properties on one element**: if position and scale (or any two transform-affecting values) both need to animate on the *same* element, don't set them as separate, independent style values — Motion builds one combined `transform` string internally, and two independently-set sources can fight. Either split the concerns across two nested elements (simplest, works whenever the layout allows it), or combine them explicitly with `useMotionTemplate` into one owned `transform` string when a single element is unavoidable.
