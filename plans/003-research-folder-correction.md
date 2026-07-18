# 003 — Research folder correction

- **Status**: DONE
- **Severity**: MEDIUM — not a UI bug, but a documentation-integrity problem: a source that confidently asserts false things about this codebase is worse than no documentation, because it's trusted by default.
- **Category**: Documentation
- **Estimated scope**: 9 files, `spec/research/design-craft/*.md` (8 individual sources + `synthesis.md`)

## Problem

`spec/research/design-craft/synthesis.md` already flagged one instance of this itself: `shared-layout-background.tsx` described as "checked against actual shipped code" when the component was in fact built, then fully reverted per the user's rejection, and no longer exists.

Reading the 8 individual source files (rather than just the synthesis) turned up three more instances of the same problem, none previously caught:

1. **`switch.tsx` press feedback** — `dimi.md`, `guri.md`, and `raphael-salaja.md` all describe it as a Motion `animate()` ref call with spring physics (`stiffness: 500, damping: 30`), cross-checked against each other as if confirming real code. The actual file is pure CSS: a `scale-x-110` transform on `:active` via a plain selector, no Motion import anywhere in it.
2. **`tabs.tsx` indicator** — `guri.md` and `raphael-salaja.md` describe it as spring-driven `AnimatePresence` with a `custom` prop. The actual file: `transition-[width,translate] duration-200 ease-in-out`, plain CSS transition, zero Motion.
3. **Fonts** — `michael-sommer.md` and `shu-ding.md` state `--font-body`/`--font-heading` are both "Geist Variable," described as an explicit placeholder awaiting a future heading-typeface decision. The actual `styles.css` already has three distinct Cal Sans faces (`Cal Sans UI`/`Text`/`Geo`) — that decision isn't pending, it's already made, and made differently than described.

All four contradictions are independently verifiable by reading the actual files (`switch.tsx`, `tabs.tsx`, `styles.css`) against the corresponding claims — this isn't a matter of interpretation. The likely explanation: this folder was written against a different state of the repo (a prior branch, a reset, or speculative work that was drafted but never actually committed) and never reconciled against the tree afterward.

## Proposed fix

Per the user's direction: **strip the false claims, keep the research value.** Concretely, for each of the 9 files:

- Remove or correct any sentence that asserts a specific fact about _this repository's current code_ that doesn't hold up (component exists, uses a specific technique, has a specific value) — the four found above, plus a fresh re-check of every other "checked against actual shipped code" / "already in this codebase" claim in all 9 files while doing the pass, not just the four already caught.
- Where a claim was about a technique or a set of tuned values (e.g. the switch/tabs spring parameters `stiffness: 500, damping: 30` / `duration: 0.25, bounce: 0.15`) rather than a checked fact, reframe it as prospective guidance instead of deleting it outright — e.g. "if this component becomes Motion-based, these are reasonable starting spring values" rather than erasing genuinely useful tuning knowledge just because the surrounding claim was wrong.
- Leave every general, non-codebase-specific point untouched: author philosophy, UX laws, technique descriptions, "worth knowing for later" items. None of that is in question — only the specific claims about what exists in `src/` right now.
- Fix the font claim's framing specifically: the heading-typeface decision is resolved (Cal Sans, three faces), not pending — Michael Sommer's font-pairing rule (serif+sans, not two-of-a-kind) no longer applies as "a constraint to apply later," since the choice already made doesn't fit that failure mode either way (it's a differentiated type family, not two same-category sans-serifs).
- `synthesis.md` inherits the same corrections wherever it restates any of the above (it currently repeats the `shared-layout-background.tsx`/switch/tabs claims via its own cross-references).

## Boundaries

- Do NOT delete any file or section wholesale — this is a correction pass, not a purge. The exposure/analytical-thinking/taste material, the UX laws, the spring-vs-duration principle, and everything already absorbed into `interaction-craft` stay as-is.
- Do NOT re-verify claims that are pure opinion or external-source description (e.g. "Raphael Salaja argues X") — only claims that assert something about _this_ repository's code.

## Verification performed

Read all 9 files fresh, re-checked every "matches/checked against actual code" claim against the real files (not re-asserted from the earlier draft) before editing. Found 3 more instances beyond the 4 already known, none previously caught:

- `dimi.md` and `synthesis.md` both framed `switch.tsx` as having "sidestepped" a Motion `useMotionTemplate` problem by splitting position/scale across two elements — `switch.tsx` animates `translate`/`scale` as independent CSS properties on the _same_ thumb element via plain CSS, which never had that problem to sidestep (no Motion involved at all).
- `raphael-salaja.md`'s intro listed `toggle-group.tsx` as sound-wired — it isn't; it renders Base UI's primitive directly rather than the sound-wired `Toggle` component. The same sentence also cited a `sonner.tsx` file that doesn't exist — the real toast component is `toast.tsx`.
- `michael-sommer.md`'s weight-contrast point named "Geist Variable" a second time, missed by the first pass through that file since the correction was made higher up in the same document.

All corrections written directly into the 9 files; no further action needed for this plan.
