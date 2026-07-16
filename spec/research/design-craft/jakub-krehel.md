# Jakub Krehel — jakub.kr

Research record, not a locked decision. See `spec/research/design-craft/emil-kowalski.md` for the disclaimer.

**Important to flag up front: post 2 below is not "similar to" the `make-interfaces-feel-better` skill already loaded this session — it *is* the source.** The article ends by pointing readers to `npx skills add jakubkrehel/make-interfaces-feel-better`. Noted plainly rather than re-summarized, since re-deriving it from the article would just be restating a skill already in use.

Eight posts across writing, case-study work, and short technical component notes.

---

## 1. Less Is More, More or Less

<https://jakub.kr/writing/less-is-more>

Core argument: AI collapses the cost of *adding*, which makes restraint the actual differentiator — "more things being made doesn't mean better things are being made." His sharpest example restates the Raycast/frequency argument (Emil Kowalski, and now several sources) with a harder number attached: a context menu animated 200 times a day wastes over 6 hours a year, in aggregate, across users. Once you actually account for real usage frequency, removing the animation stops being a stylistic call and becomes "the obvious decision."

**The third independent instance now of "codify judgment into a skill file so agents (and humans) don't have to re-derive it every time."** He cites his own company's `/codebase-standards` skill for exactly this purpose — same instinct as Emil Kowalski's "Agents with Taste" post, and the same mechanism this project already uses (`make-interfaces-feel-better`, `emil-design-eng`, `CLAUDE.md` itself, and this research folder feeding back into them). His stated caveat matches this project's own posture: agents execute well but don't yet supply judgment — deciding *what's worth building* and *what detail matters* stays a human call, agents are "extensions of your capabilities," not a replacement for deciding what to do with them.

## 2. Details That Make Interfaces Feel Better

<https://jakub.kr/writing/details-that-make-interfaces-feel-better>

This is the source article for the `make-interfaces-feel-better` skill already loaded and actively used this session (concentric border radius, optical alignment, shadows over borders, image outlines, contextual icon animation via opacity/scale/blur, interruptible CSS transitions over keyframes, staggered entrances, subtler exits, `text-wrap: balance`/`pretty`, `-webkit-font-smoothing`, `tabular-nums`). Nothing to extract here that isn't already in active use — noted for completeness of the record, not re-derived.

## 3. Using Gestures in Motion

<https://jakub.kr/work/motion-gestures>

Reference piece on Motion's six gesture props: `whileHover`, `whileTap`, `whileDrag`, pan (`onPanStart`/`onPan`/`onPanEnd`, no `while-` prop), `whileFocus`, and `whileInView`. Two details worth keeping on record: **Motion's gesture-driven animations run on the compositor thread, same as CSS** — using them isn't a performance tradeoff against CSS transitions, contrary to an assumption that might otherwise seem reasonable. And **Pan requires roughly 3+ pixels of movement before it's recognized**, specifically to distinguish a pan from a tap — a concrete threshold worth knowing if a future drag/pan interaction ever needs tuning. `whileFocus` respects `:focus-visible` semantics specifically (keyboard-triggered focus, not mouse-click focus) — the correct, accessible default, worth confirming any future focus-triggered animation in this codebase does the same.

## 4. Drag Gesture (iOS 26-style swipe reveal)

<https://jakub.kr/work/drag-gesture>

A swipe-to-reveal-actions case study with real, specific numbers: first action reveals at 44px of drag, second at 88px, and a 58px threshold decides whether the row commits open or snaps back closed. Implementation: `drag="x"`, `dragConstraints`, `dragElastic={0.05}` (tight, minimal overshoot), and notably **`dragMomentum={false}`** — velocity-based fling is deliberately disabled so the row always lands exactly on a snap point instead of an imprecise momentum-based rest position.

**Worth flagging as a genuine, useful tension against Rauno Freiberg's "Interaction Design" post** (`rauno-freiberg.md`), which argues dismissal gestures should *preserve* the swipe's actual velocity and trajectory for authenticity. Neither is wrong — the difference is what the gesture is for: Rauno's example is a one-way dismissal with no fixed landing spot, where momentum communicates the user's intent was actually understood; this is a reveal-to-fixed-positions interaction, where predictability (always landing exactly on 44px/88px) matters more than physical authenticity, because the revealed buttons need to be reliably tappable afterward. Worth remembering as a real judgment call, not a rule: preserve momentum when there's no fixed destination, kill it when the interaction must land on an exact, reusable position.

## 5. Using AI as a Design Engineer

<https://jakub.kr/work/using-ai-as-a-design-engineer>

His stated principle: "I don't use AI to come up with ideas or to replace my own thinking. I use it to accelerate my workflow." Practices: codebase rules files written once, up front, instead of re-explaining preferences every session; small sequential requests over one large monolithic one, without assuming an agent retains context across separate conversations; Context7 for current library documentation instead of trained knowledge. All of this matches conventions already established in this exact project (`CLAUDE.md`'s "one significant step at a time," the `find-docs`/`ctx7` workflow used throughout this whole session, session logs in `spec/sessions/` specifically because agent context doesn't persist by default).

His closing point is worth keeping as the actual stated reason this research folder exists at all: as AI-generated output becomes ubiquitous, "quality and craftsmanship become increasingly important" as the actual differentiator, in a landscape saturated with — his word — AI **slop**. Same term this project's own `/deslop` skill is named after, independently.

## 6. `will-change` in CSS

<https://jakub.kr/components/will-change-in-css>

Same guidance already in `make-interfaces-feel-better` (compositor-friendly properties only, never blanket `will-change: all`, "not a magic performance switch"). One nuance the skill's phrasing doesn't spell out: the *reason* first-frame stutter happens without it is that the browser pays the cost of promoting an element to its own GPU compositing layer at the moment the animation starts; `will-change` lets that promotion happen during idle time beforehand, so the cost is already paid before the animation needs it. Useful to know *why* the skill's "add when you notice first-frame stutter" guidance works, not just that it does.

## 7. Shared Layout Animations

<https://jakub.kr/work/shared-layout-animations>

Directly relevant to `shared-layout-background.tsx`, built this session from a different source (dimi's trick) using the same underlying technique (Motion's `layoutId` FLIP animation). His framing of the core idea is worth keeping as the clearest statement of it found in this whole research folder: **"we don't manipulate an individual component. Instead, we render different components in different places in different states that happen to look the same."** That's exactly what `SharedLayoutBackground` does — the moving highlight isn't one element being translated, it's the same `layoutId` appearing in a new location each time, and Motion interpolates the rest.

**One real caveat worth checking against the actual implementation, not just noting in passing**: he warns to keep `layoutId` elements *outside* `AnimatePresence` when possible, because a layoutId element's own enter/exit animation can visually fight its layout-position interpolation (an unwanted flash of opacity change layered on top of the slide). In `shared-layout-background.tsx`, the `layoutId`-bearing element is nested *inside* an `AnimatePresence` block — but it carries no `initial`/`animate`/`exit` of its own (only `layoutId` and `transition`); the opacity/blur enter-exit lives on its *parent* wrapper instead, and that wrapper doesn't unmount during in-group moves (only at the true group boundary). This was tested working correctly by hand already, so there's no known bug — but this is the specific mechanism to check first if `shared-layout-background.tsx` ever gets modified and starts showing an unexpected flash or fade during a move between items.

Also worth remembering: duplicating the same `layoutId` twice within one rendered state breaks the animation entirely — confirmed not currently at risk here, since `SharedLayoutBackground` only ever renders the `layoutId` element for exactly one index (`activeIndex === index`) at a time.

## 8. OKLCH Colors

<https://jakub.kr/components/oklch-colors>

This project's entire color system (`styles.css`) is already built on OKLCH, and the `oklch-skill` is available in this environment — this post is confirmation of an already-made choice, not new information about *whether* to use it. Two technical caveats worth keeping on record for whenever gradients or new color tokens get added:

- **Gamut clipping**: a high-chroma OKLCH value can exceed what the display can actually show and gets clipped/remapped to the nearest representable color, sometimes looking noticeably different than authored. Worth checking any new high-chroma token against real display output, not just the value on paper.
- **OKLCH is not the best space for gradients specifically** — because hue is circular, a gradient between two hues can take an unexpected path around the color wheel. He recommends **OKLab** for gradients instead, since it interpolates in a straight line. This project has no gradients defined yet; worth remembering OKLab over OKLCH specifically for that case when one gets added, even though every other color token stays OKLCH.
