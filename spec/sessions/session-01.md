## Session 01

Write facts only. No plans, no advice, no narration.

**Filename:** `session-01.md`
**Session Status:** Closed

---

## Status at Start

- **Sprint goal:** Audit all installed UI primitives on a disposable page before locking the component set for dashboard work.
- **Last blocker:** None
- **Feature state:** No audit page existed yet.

---

## Completed

- Built disposable `/ui` audit route (`src/routes/ui.tsx`, `src/dev/ui-audit/*`) covering all 54 installed UI primitives; documented as easily removable.
- Added global "D" hotkey theme toggle (`src/hooks/use-theme.ts`, `src/components/theme-hotkey.tsx`), SSR-safe, no-`useEffect`.
- Fixed stale typography description in `spec/identity/project-dna.md`.
- Fixed input-group icon-button sizing bug (`icon-sm` → `icon-xs`, only `icon-xs` is addon-aware) and added 10 missing input-group variants.
- Changed `Select`'s default `alignItemWithTrigger` to `false` in `src/components/ui/select.tsx`.
- Fixed `Alert` usage bug: `AlertAction` was nested inside `AlertDescription` instead of a sibling, breaking its layout.
- Added 8 drawer variant groups (inset, straight, scrollable, nested, snap points, mobile menu, responsive dialog, responsive menu) to the audit page.
- Root-caused and fixed a real drawer animation bug in `src/components/ui/drawer.tsx`: `--inset:--spacing(0)` compiled to a unitless `0` in this Tailwind version, invalidating `calc()` chains and killing entrance/exit transitions on non-`inset` drawer variants (and corrupting snap-points behavior); fixed to `--inset:0px`.
- Documented the drawer `--inset` gotcha in coss skill docs (`.claude/skills/coss/references/primitives/drawer.md`, mirrored in `.agents`) so a future component re-install doesn't silently reintroduce it.
- Verified full animation matrix (13 cases: every drawer variant × position, open + close) via automated frame sampling — all pass, zero console errors; cross-checked against coss.com's live site.

---

## Decisions

- Component audit happens on a disposable, removable `/ui` route rather than real app routes, so primitives can be reviewed/fixed before the component set is locked for dashboard work.
- `Select`'s `alignItemWithTrigger` defaults to `false` project-wide (root-level change in `select.tsx`, not a per-usage override).

---

## Blockers

1. None

---

## Session End

- Session ended

---

## Do Not Include

- Brainstorming
- Implementation plans
- Transcript-style recap
- Repo-wide rules already covered in `AGENTS.md` or `CLAUDE.md`
- Motivational or steering language
