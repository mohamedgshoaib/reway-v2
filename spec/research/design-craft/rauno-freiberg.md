# Rauno Freiberg — devouringdetails.com, rauno.me

Research record, not a locked decision. See `spec/research/design-craft/emil-kowalski.md` for the same disclaimer and the reasoning behind it.

Five posts across two of his sites, not five of the same thing: a prototype writeup (dense, technical, high signal), a personal-opinion handbook (explicitly framed by the author as preference, not dogma), a behind-the-scenes essay (mostly about building his own site, with one useful philosophy point), and two `rauno.me/craft` essays on interaction design and depth (closer in register to the Emil Kowalski/Raphael Salaja posts — craft philosophy with concrete examples, not engineering writeups).

---

## 1. Next.js Dev Tools Prototype

<https://devouringdetails.com/prototypes/nextjs-dev-tools>

Writeup of interaction-design work on Next.js 15.2's dev tools overlay. This is the highest-signal post of the three — dense with specific, load-bearing engineering decisions, not general advice.

**Core engineering principle, stated more strongly than anything in the Emil Kowalski batch:** interactions should be **interruptible, and in the worst case, tolerate spamming without breaking.** This isn't scoped to animation — it's a general robustness bar for any interactive component. Directly validates the project's existing "use CSS transitions, not keyframes, for anything that can be rapidly retriggered" rule, but frames it as a correctness requirement, not a nicety.

**Never animate on initial render — only on user input or a system-triggered state change.** His framing is sharper than "skip enter animation on load": he says animating on page load makes "the application feel poorly built." Matches `AnimatePresence initial={false}` already in the loaded skills, but the reasoning (it reads as a *bug*, not just unpolished) is worth keeping.

**Cancel animations that can't keep up.** When state updates arrive faster than an animation can complete (his threshold: within 150ms of the previous update), he cancels the in-flight animation rather than letting it queue or fight the next one. This is a technique the loaded skills don't currently cover — worth remembering for anything driven by rapid external updates (a live counter, a streaming value), not just user-triggered UI.

**Concentric hit areas via sibling structure, not nesting.** He gets maximized, non-overlapping hit areas by structuring adjacent buttons as *siblings* with careful sizing, rather than nesting a small visual button inside a larger invisible hit-target wrapper. This is a **different technique than the one used in this codebase** — verified against the actual files (not just asserted): `button.tsx`, `toggle.tsx`, `select.tsx`, `combobox.tsx`, `sidebar.tsx`, `number-field.tsx`, `autocomplete.tsx`, and `badge.tsx` extend hit area via a `pointer-coarse:after:` pseudo-element on the same node. `checkbox.tsx`, `switch.tsx`, and `radio-group.tsx` do **not** currently use this pattern — an earlier draft of this note claimed they did; corrected 2026-07-18. Both techniques solve the same problem (make-interfaces-feel-better's "never let hit areas of two elements overlap" rule); his sibling approach is worth considering specifically for tightly-packed toolbars where two small controls sit right next to each other and pseudo-element extension risks overlapping into the neighbor's hit area — something the `after:` approach doesn't fully solve on its own.

**Debugging via forced-state keyboard shortcuts**, not manual reproduction: he wired dedicated keys to rapid-toggle specific edge-case states, on the reasoning that "the only way to sand all edge cases is to just click around a lot" — but made the clicking cheap instead of manual. This is a development-workflow practice, not a UI rule; worth remembering for any future component with several hard-to-reach states (open/closed/error/loading combinations).

Other specifics, lower relevance right now but worth having on record: physics-based drag using velocity projection tuned to iOS's actual deceleration constant (0.998) for a "flick snaps to nearest corner" interaction; a scroll-fade technique using a sticky-positioned blur layer with opacity interpolated to scroll distance; replaying CSS `@keyframes` by changing a React `key` instead of pulling in an animation library, when the animation is simple enough not to need one.

## 2. React Handbook

<https://devouringdetails.com/resources/react-handbook>

Explicitly framed by the author as personal preference, not a rulebook — worth keeping that framing when applying any of it. Several points here already overlap with skills available in this environment (`vercel-composition-patterns`, `vercel-react-best-practices`) since Rauno's background is the same Vercel/Radix lineage those draw from.

- **Contextual props**: name props for their scope, not their globally-qualified meaning — `isOpen` inside a `Dialog`, not `isDialogOpen`. The parent's name already provides context; re-stating it in the prop name is noise.
- **Derived over redundant props**: don't add a boolean flag when it's inferable from a prop that already exists — his example, don't add `isClosable`, derive it from whether `onClose` was passed at all.
- **Enum props over boolean flags**: `variant="primary"` instead of `isPrimary`/`isSecondary`, specifically to make impossible states (`isPrimary && isSecondary`) unrepresentable, with IDE autocomplete as a secondary benefit.
- **Low-level compound components over bloated high-level props**: his tradeoff is stated honestly — more visual/structural verbosity at the call site, in exchange for not accumulating "nasty props down from the parent" as a component grows. This is the same tradeoff already made in this codebase's own compound components (`Tabs`/`TabsList`/`TabsTrigger`, `NavigationMenu`/`NavigationMenuItem`/`NavigationMenuTrigger`, etc.) — confirms the existing pattern rather than introducing a new one.
- **Bypass React reconciliation for high-frequency interactions**: manipulate the DOM directly via a ref instead of routing every frame through state, specifically to hold 60fps. **Correction (2026-07-18): an earlier draft of this note claimed this technique was already shipped in `switch.tsx`'s press feedback via a Motion `animate()` ref call. Checked against the actual file — `switch.tsx`'s press feedback is pure CSS (a `scale-x-110` transform gated by an `:active` attribute selector on the thumb), not a ref-based imperative animation; there is no Motion `animate()` call in the file.** The technique itself remains worth knowing for any future genuinely high-frequency, pointer-driven interaction (a drag, a live value tracking the pointer 1:1) — it just isn't demonstrated by real code in this repo yet.

## 3. Behind the Scenes

<https://devouringdetails.com/resources/behind-scenes>

Mostly an essay about building his own site (devouringdetails.com itself) — naming, branding, video-placeholder handling, custom iconography sized for pixel-grid alignment. Most details are specific to that product, but the edge-case craft principle below transfers to Reway.

One point worth keeping: he treats "less novel" interactions — his example is navigating to an invalid page — with the same design care as primary features, on the reasoning that craft which only shows up in the happy path isn't actually craft, it's decoration. Same spirit as this project's own accessibility rules already in CLAUDE.md (aria-live on async updates, keyboard handlers on every interactive element) — not new information, but a useful one-line justification for why those rules exist, if that's ever questioned: **the edge cases are where craft is actually tested, not where it's optional.**

## 4. Interaction Design

<https://rauno.me/craft/interaction-design>

**The single strongest match found so far between outside research and a rule this project already had written down before any of this research started.** His "responsive immediacy" principle: lightweight, reversible actions (his example: displaying a preview overlay) should trigger live, during the gesture, while destructive or costly actions (dismissing/committing) should require the gesture to actually complete. That is, close to word for word, `CLAUDE.md`'s own standing rule: **"Reversible actions: local-first optimistic. Destructive mutations: explicit pending state + confirmation."** Worth having an outside, independent source stating the same split for the same reason (protecting the user from accidental commitment while keeping everything else fluid) — this wasn't discovered by this research, it's a confirmation of a rule that predates it.

Other points:
- **Metaphorical design** — interactions should mirror real-world physical behavior users already understand: a swipe replicates turning a page, a pinch mirrors the fine motor control of an actual precise grip. The interface borrows intuition the user already has, rather than teaching a new one.
- **Momentum-preserving dismissal** — a swipe-to-dismiss gesture should carry the actual velocity and trajectory of the swipe into the exit animation, not snap to a canned exit. Signals the system understood the specific gesture, not just that *a* dismiss happened.
- **Spatial consistency in launch/dismiss** — an app opening should visibly emerge from its home-screen icon's position; returning to the app switcher should slide in from the side matching its position in the stack. Same "spatial consistency" purpose already named in `emil-design-eng`'s animation-purposes list, with much more specific, concrete examples than that skill currently has.
- Restates the now heavily-corroborated "best animation is no animation" position specifically for high-frequency, low-novelty interactions — remove animation, don't add it.
- A small physical/tactile note, low direct web relevance but a nice illustration of the principle: he cites the Magic Mouse's deliberately "fidgetable" friction as satisfying casual manipulation during thinking, not just functional scrolling — craft can serve idle tactile pleasure, not only task completion.

## 5. Depth

<https://rauno.me/craft/depth>

- **Staging, independently, again.** His iOS Home Screen swipe example — blur happens first, then Siri suggestions appear, then the keyboard subtly reveals before fully expanding — is the same Disney "Staging" principle from Raphael Salaja's 12 Principles post (sequence *which part* of a multi-part interaction animates first, don't animate everything at once). Two different sources, two different concrete examples, same underlying rule. Worth treating as confirmed, not just asserted once.
- **Blur as a depth/focus cue**: dim and blur the backdrop when an overlay opens, described explicitly as "lowering it on the z-axis" — mimicking depth-of-field rather than just dimming for contrast. Worth a look against this codebase's own `dialog.tsx`/`sheet.tsx`, which currently use a plain dim overlay, not a blurred one — not a stated defect, just a concrete direction to consider if backdrop treatment ever gets revisited.
- **Animation style itself as an affordance for interactivity**: an element that slides away while *keeping* its opacity signals it's still interactive (his iPad Dock example); an element that fully blurs out signals it's now inert (the Home Screen backdrop during search). The *manner* of the exit communicates state, not just the fact that something exited.
- **Stagger should feel organic, not just timed** — his framing is "leaves of a tree" moving without "jarring concert" synchrony. Complements, rather than repeats, the numeric stagger guidance already in `make-interfaces-feel-better` (30–80ms between items): that skill has the timing number, this supplies the qualitative goal the timing number is actually in service of — natural variation, not mechanical unison.
- Reiterates that decorative layering must be purposeful, not gimmick — same throughline as every other source in this folder on when animation/visual flourish earns its keep.
