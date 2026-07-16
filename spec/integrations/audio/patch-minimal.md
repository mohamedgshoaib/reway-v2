# Patch: Minimal

## What's installed

The "Minimal" patch — 26 sine-based UI sounds ("ultra-clean... for quiet, transparent UI feedback"), matching Reway's restrained, no-hype posture better than the other 9 registry patches (Core, Crisp, Drums, Mechanical, Organic, Playful, Retro, Soft, Synths).

Installed via the CLI into `.web-kits/`:

- `.web-kits/config.json` — `{ "output": ".web-kits" }`
- `.web-kits/minimal.ts` — generated, typed `SoundDefinition` export per sound, plus a `_patch` aggregate. Comment header says "do not edit" — treat it like generated coss ui code, own it but don't hand-edit it; re-run the CLI to update.
- `.web-kits/index.ts` — barrel re-exporting `minimal` as a namespace

`.web-kits/**` is excluded from `oxlint`, `oxfmt`, and `react-doctor` (same treatment as other generated output) — see `.oxlintrc.json`, `.oxfmtrc.json`, `doctor.config.json`.

## Sounds available (26)

`tap`, `click`, `key-press`, `toggle-on`, `toggle-off`, `checkbox`, `select`, `deselect`, `hover`, `tab-switch`, `expand`, `collapse`, `page-enter`, `page-exit`, `success`, `error`, `warning`, `notification`, `info`, `copy`, `send`, `delete`, `undo`, `pop`, `swoosh`, `slide`.

Only `click`, `checkbox`, `toggle-on`/`toggle-off`, `tab-switch`, `success`/`error`/`warning`/`info` are wired to anything today — see `component-wiring.md`. The rest are installed and typed, ready to use, but not yet attached to a component.

## Re-installing / updating

```
pnpm dlx @web-kits/audio add raphaelsalaja/audio --patch minimal -y
```

## CLI bug: hangs on first run in non-interactive shells

The CLI's `ensureConfig()` (in `dist/bin.js`) always prompts interactively for an output directory on first run — **it ignores `-y`/`--yes` entirely**. In a shell without a real TTY (CI, some agent sandboxes), this crashes with `SystemError [ERR_TTY_INIT_FAILED]`, surfacing as a misleading `Failed to install <patch>: ...` message.

Workaround used here: pre-create `.web-kits/config.json` with `{ "output": ".web-kits" }` before running `add`. `ensureConfig()` finds the existing config and skips the prompt. Do this once per machine/CI environment if re-installing from scratch in a non-interactive shell; not needed if a real terminal is available.
