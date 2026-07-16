# Emil Kowalski — emilkowal.ski/ui

Research record, not a locked decision. Nothing here is binding until it's promoted into a skill update or a `spec/identity/` doc — see `spec/research/design-craft/synthesis.md` (not yet written; waiting for posts from other sources before drawing cross-cutting conclusions).

Much of this author's animation-mechanics content (scale-on-press value, don't-animate-from-zero, tooltip instant-hover, origin-aware popovers, easing choice, clip-path basics) is already encoded in the `emil-design-eng` and `make-interfaces-feel-better` skills loaded this session — those skills are literally built from his writing. Notes below flag what's already covered vs. genuinely new, so this file doesn't just restate the skill.

---

## 1. You Don't Need Animations

<https://emilkowal.ski/ui/you-dont-need-animations>

Core claim, stated flatly: **the best animation is no animation.** Animation isn't a default you add for polish — it's a cost you pay only when it buys something specific. His three legitimate purchases: explaining functionality (Linear's Product Intelligence demo), enhancing responsiveness (button press feedback), and spatial consistency (a toast that exits the direction it can be swiped). Everything else is decoration.

The sharpest point is about frequency, not duration: Raycast has **zero** open/close animation, deliberately, because it's used hundreds of times a day — at that frequency, an animation isn't delight, it's friction between the user's intent and the result. Keyboard-triggered actions get the same treatment: never animate them, because the animation introduces a perceived lag between "I pressed the key" and "it happened," and that gap is felt more than any visual polish is appreciated.

Already covered in `emil-design-eng` (its "Animation Decision Framework," frequency table, "never animate keyboard-initiated actions"). What this post adds that the skill's table format loses: the *framing*. It's not "here's a frequency chart," it's "justify every animation's existence or cut it." Worth carrying that framing into how this gets applied here, not just the rule.

## 2. Agents with Taste

<https://emilkowal.ski/ui/agents-with-taste>

This is the one directly about what we're doing right now, not about UI. Core claim: AI agents don't lack taste because taste is unteachable — they lack it because nobody wrote down *why* the decisions are right. His load-bearing line: **"almost every 'taste' decision has a logical reason if you look close enough."** Taste isn't mystical judgment, it's compressed reasoning that hasn't been unpacked.

His method: write skill files that state the rule *and* the reason (scale from 0.95 not 0, "because it looks like the element comes out of nowhere" otherwise), give agents a decision flowchart instead of a single fixed value (his easing flowchart branching on entrance/exit vs. hover vs. constant motion), and let the agent execute against explicit criteria instead of guessing. He's explicit about the boundary: this maximizes agent leverage on *execution*, not *ideation* — "the more creative part of the job is still up to you." Skill files don't replace a human deciding what's worth building; they remove ambiguity from how it gets built once the direction is set.

Direct relevance: this describes the exact shape of `make-interfaces-feel-better`/`emil-design-eng`/CLAUDE.md's Animation Rules already in this repo, and now this `spec/research/design-craft/` folder itself. Worth remembering as a check on this folder's own purpose going forward: a note here is only valuable once it's been unpacked into "the rule, and why," not just "here's a link and a vibe."

## 3. Developing Taste

<https://emilkowal.ski/ui/developing-taste>

Different register from the other four — this one's about a human practice, not a UI rule, so it doesn't map onto a skill file at all. Core claim: taste is a trained instinct, not an innate preference, developed through three deliberate practices, not passive exposure:

- **Exposure** — study work from people who are demonstrably better, on purpose, not incidentally (his Steve Jobs citation: "expose yourself to the best things that humans have done and try to bring those into what you're doing").
- **Analytical thinking** — stop at "I like this" and ask why it works. Interrogate the actual decision, not just the feeling it produced.
- **Practice with feedback** — make things continuously and get critiqued by people whose judgment you trust; trial-and-error alone is slow.

The most useful part for anyone actually doing this (not just reading about it): he names the **"taste gap"** — the period where your taste has improved enough to see that your own output falls short, but your execution hasn't caught up yet. He frames the discomfort of that gap as proof the system is working, not a signal to quit. Worth remembering the next time a self-review here reads as harsh — that's the mechanism functioning correctly, not a problem.

## 4. The Magic of Clip Path

<https://emilkowal.ski/ui/the-magic-of-clip-path>

Base mechanics (non-layout-affecting, hardware-accelerated, coordinate-based `inset()`) are already in the `emil-design-eng` skill's clip-path section. What's genuinely new here — techniques the skill doesn't currently spell out:

- **Text masking**: layer a dashed-style and solid-style version of the same text, then use complementary `clip-path` values on each so a pointer/scroll interaction reveals one through the other. Not in the skill's current clip-path list.
- **Comparison sliders**, described in more mechanical detail than the skill has: overlay two images, drive one's `clip-path: inset()` value directly off drag position — no extra `overflow-hidden` wrapper element needed, since the clip itself does that job.
- Scroll-triggered reveals via Framer Motion's `useInView` + `useTransform` mapping scroll progress straight to an `inset()` value.

His caveat is worth keeping attached to the tab-transition and theme-switch tricks specifically: the "duplicate the element, clip to reveal" approach is, in his own words, "hacky" — it requires a full duplicate of the DOM subtree to get a clean transition. He's explicit that this is a real cost, not a free lunch, and that these are cumulative-polish details most users will never consciously notice — the payoff is aggregate, not individual.

## 5. 7 Practical Animation Tips

<https://emilkowal.ski/ui/7-practical-animation-tips>

Almost entirely already encoded in `emil-design-eng` and `make-interfaces-feel-better` (scale-on-press, never scale from 0, tooltip instant-hover via `data-instant`, origin-aware popovers, easing choice, sub-300ms durations, blur-to-mask). One concrete numeric mismatch worth flagging rather than silently ignoring:

**He uses `scale(0.97)` for button press feedback; this project's skill (and every button/checkbox/switch/toggle built this session) uses `0.96`, with an explicit rule that anything below `0.95` feels exaggerated.** Both values sit inside his own stated safe range — this isn't a contradiction, just a reminder that the project's chosen value is a deliberate pick within his guidance, not a deviation from it. No action needed, just noting it so a future pass doesn't "fix" `0.96` back to `0.97` thinking it's correcting a drift from the source.

The one framing worth carrying forward from this post specifically: blur-as-last-resort. He's explicit that `filter: blur()` is what you reach for *after* duration and easing adjustments have failed to make a crossfade feel smooth — not a first-choice tool. Worth keeping that ordering (fix timing first, mask with blur only if timing genuinely can't fix it) if this comes up in a future review.
