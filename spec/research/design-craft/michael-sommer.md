# Michael Sommer — uxdesign.cc

Research record, not a locked decision. See `spec/research/design-craft/emil-kowalski.md` for the disclaimer.

Different register than every prior source in this folder — content strategy, layout architecture, and typography, not animation or component engineering. Broadens what this folder covers, which matches the original brief for it: patterns and taste, not just code tricks.

---

## 1. Maximizing UX with Content Design

<https://uxdesign.cc/maximizing-ux-with-content-design-c8cbc743fc1f>

Core claim: **content design should be the first activity in product development, not a pass applied after the visual design is done.** His five principles (simplicity, consistency, strategic alignment to product goals, visualization, testing/iteration) are generic enough not to need restating individually — the useful part is the framework underneath them.

**The Peak-End Rule is the single most directly actionable idea in this post**: users judge an entire experience mostly by its most intense moment and its ending, not by an average across every step. His stated implication — stop trying to polish every touchpoint equally, and instead identify and perfect the *specific* moments that will disproportionately shape how the whole experience is remembered. Directly relevant the next time real homepage work starts: it's a concrete way to decide where craft effort actually pays off (almost certainly the hero's first few seconds, and whatever the page ends on — a closing CTA or final impression) rather than spreading equal effort across every section.

His three-step research scaffold (personas → user stories in "as a [persona], I want [need], so that [goal]" form → journey mapping) is not a new process, but it reinforces Reway's user-first posture: capture and retrieval needs should drive decisions before implementation detail or internal preference.

One honest caveat worth keeping: he admits stakeholder alignment is genuinely painful ("seagulling" — people swooping in with disagreements and swooping out again), and that poor-quality supporting visuals actively hurt more than they help. Not a technique, just a realistic expectation-setter.

## 2. Why Designers Should Care About CSS Grid

<https://uxdesign.cc/why-designers-should-care-about-css-grid-c4fd6b0385f1>

Argument: CSS Grid replaced a lineage of layout approximations (HTML tables, then Bootstrap's rigid 12-column framework) that never actually captured a designer's real intent — they were workarounds for the layout tool's limitations, not expressions of the layout itself. Grid lets structure be defined from the content's actual needs (custom column/row structures, per-breakpoint layout changes, nested grids for hierarchy) instead of forcing content into a predetermined slot count. His borrowed line from Rachel Andrew is worth keeping as-is: **"this is not exciting, but it will let you do exciting things."**

His framing is about designer/developer fluency across a role divide, which doesn't map directly onto this project's workflow — but the underlying point still applies: reach for real CSS Grid (including subgrid) when a layout has genuine custom structure, rather than defaulting to a fixed column count or forcing something flexible into a rigid frame. **Correction (2026-07-18): an earlier draft framed this against a "decision already made this session" — that a `SharedLayoutBackground` component had its baked-in `grid-cols-subgrid` deliberately stripped out during adaptation. No such component exists in this codebase** (it was prototyped, then fully reverted, before this note was written) — there was no subgrid-stripping decision to confirm. The underlying point stands on its own regardless: don't bake Grid assumptions into a generic primitive before a real consumer needs one, *do* reach for real Grid once an actual layout with real structural needs exists — which hasn't happened yet, since no real pages are built.

## 3. 5 Typography Rules for Non-Designers

<https://uxdesign.cc/5-typography-rules-for-non-designers-7fb72bb40984>

The most concretely applicable post in this batch, and one rule lands directly on a decision this project has explicitly deferred rather than made:

1. **One font family by default; if you must pair two, pair serif with sans-serif, not two of the same category.** His stated failure mode is specifically two similar sans-serifs fighting each other. **Correction (2026-07-18): an earlier draft described the project's heading typeface as an unresolved placeholder (`--font-body`/`--font-heading` both set to Geist Variable). That's no longer accurate — `styles.css` now defines three distinct Cal Sans faces** (`Cal Sans UI` for body, `Cal Sans Text` for headings, `Cal Sans Geo` for display), plus `JetBrains Mono` for code. The decision this rule was meant to inform is already made, and made as a differentiated type family rather than a same-category pairing — so his specific failure mode (two similar sans-serifs) doesn't apply here either way. Keeping the rule on record for any *future* font decision, not this one.
2. **Stick to a small set of proven typefaces**, and a genuinely useful readability note: serif fonts read better at small body-copy sizes, sans-serif faces read better at large display sizes. Also directly relevant to that same future heading-font decision.
3. **Double or halve point size for contrast** between text levels (body 20px → headline 40px, occasionally 3–4x for special emphasis). This project doesn't currently have an explicit locked type scale on record — worth applying this as a starting heuristic whenever one gets defined, rather than picking arbitrary intermediate sizes.
4. **Use weight contrast deliberately** — bold or light, rarely plain "regular," since subtle weight differences are easy for a reader to miss entirely. (Corrected 2026-07-18: an earlier draft named "Geist Variable" here — the project's actual fonts are the three Cal Sans faces plus JetBrains Mono, see the correction under point 1. Whether the Cal Sans faces ship fine-grained variable weight control the way Geist Variable does hasn't been separately checked — worth confirming against the actual font files before relying on this point.)
5. **Whitespace as a design material, not leftover space** — his stated heuristic when a composition feels off: cut the number of elements in half rather than shrinking everything to fit. A concrete, reusable decluttering test for whenever real page density decisions come up, not just a typography note.
