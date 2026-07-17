# Handoff

## Purpose

- Continue auditing installed UI primitives on the disposable `/ui` route before locking the component set for dashboard work.

## Current Scope

- Component-by-component audit of the remaining primitives on `/ui` against official coss docs.
- Out of scope: dashboard implementation itself (not started).

## Current State

- See `spec/sessions/session-01.md` for the full completed-work log.
- Deep-audited so far: input-group, select, alert, drawer (bugs found and fixed at root in `src/components/ui/*`).
- Remaining ~50 primitives are rendered on `/ui` but not yet individually cross-checked against official docs.

## What's Next

1. Continue the primitive-by-primitive audit; user reports mismatches found while browsing `/ui`.
2. For each reported issue: fetch the official coss docs page, verify against installed component source, fix root cause in `src/components/ui/*` (not a page-level patch) if the bug is in the shared component, or fix the audit page usage if the bug is only there.
3. Once all primitives are confirmed correct, remove the disposable `/ui` route per its documented removal steps and proceed to dashboard work.

## Suggested Skills

- `coss` — component usage verification against docs/source before any fix.
- `playwright-cli` — live browser verification (animations need frame-sampling, not just static screenshots).

## Established Workflow

- Never invent coss APIs — verify against the fetched official docs page and the installed component source before writing or fixing code.
- Fix root causes in `src/components/ui/*`; never patch a bug at the audit-page usage site if the bug lives in the shared component.
- Verify visually in a real browser, not just static checks — animation bugs specifically require frame-by-frame sampling (`requestAnimationFrame`/timed position sampling), since screenshots alone miss them.
- When a fix could regress on a future component re-install (e.g. `npx shadcn add`), record the gotcha in `.claude/skills/coss/references/primitives/<name>.md` (auto-mirrors to `.agents`).
- Run `pnpm typecheck && pnpm lint && pnpm format && pnpm build` after every fix, before reporting done.
- Clean up all scratch/test files and close the browser/preview server after each verification pass.

## Key References

- `spec/sessions/session-01.md` — full log of what was audited/fixed and why.
- `src/dev/ui-audit/` — audit page implementation (sections per primitive group); disposal instructions in `src/dev/ui-audit/page.tsx`.
- `src/routes/ui.tsx` — the disposable route itself.
- `.claude/skills/coss/references/primitives/` — per-primitive usage guides, kept in sync with fixes made this session.

## Open Questions

- None.

## Redaction Rule

- Do not include secrets, credentials, tokens, personal data, or unnecessary transcript recap.
- Do not repeat content already captured in `AGENTS.md`, `CLAUDE.md`, or durable session artifacts unless the next agent would otherwise miss a critical detail.
- Do not include optional ideas, stylistic steering, or long rationale.
