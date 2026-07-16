---
name: web-kits-audio
description: Use when integrating @web-kits/audio (https://audio.raphaelsalaja.com/) — a declarative Web Audio synthesis library for UI sound feedback (clicks, toggles, notifications, and similar). Framework-agnostic: a vanilla JS/TS API plus per-framework adapters (React under /react; other frameworks follow the same provider+hook shape). Trigger on "web-kits audio", "add sound to the UI", "UI sound effects", "audio feedback", "click sounds", "sound patches", or any @web-kits/audio CLI/API question, even if the library isn't named explicitly. Always ask the clarifying questions below before writing code — don't guess scope, patch choice, default state, or persistence.
---

# @web-kits/audio

Sounds are declared as plain objects (oscillator/noise/wavetable/sample source + envelope + effects + layers) instead of raw Web Audio API calls. This file covers what's stable plus one real bug the docs don't mention; fetch a doc page below for anything else, since hook signatures, the patch registry, and CLI flags drift over time.

## Docs

Fetch only the exact page needed for the current task, not the whole table:

| Topic | URL |
| --- | --- |
| Overview | https://audio.raphaelsalaja.com/ |
| React setup | https://audio.raphaelsalaja.com/getting-started/react |
| TypeScript setup | https://audio.raphaelsalaja.com/getting-started/typescript |
| CLI reference | https://audio.raphaelsalaja.com/cli |
| Patch format | https://audio.raphaelsalaja.com/integrations/patches |
| Patch library (browse/preview) | https://audio.raphaelsalaja.com/library |
| React: SoundProvider | https://audio.raphaelsalaja.com/integrations/react/provider |
| React: useSound | https://audio.raphaelsalaja.com/integrations/react/use-sound |
| React: usePatch | https://audio.raphaelsalaja.com/integrations/react/use-patch |
| React: useSequence | https://audio.raphaelsalaja.com/integrations/react/use-sequence |
| React: useAnalyser | https://audio.raphaelsalaja.com/integrations/react/use-analyser |
| React: useListener | https://audio.raphaelsalaja.com/integrations/react/use-listener |

## Ask before writing code

Vague scope here causes real rework. Ask, don't assume:

1. **Which patch/sound set?** See the patch library link above, or the user may want sounds defined inline instead. Don't default to "Minimal" or any other patch without being told.
2. **Scope.** "Add sound everywhere" isn't a scope. Get a concrete list of components/interactions for this pass; treat the rest as a deliberate later step, not something to wire opportunistically.
3. **Mute/volume control.** If none is planned for this pass, say so explicitly — sound-on-by-default with no visible way to turn it off is a real accessibility gap, not a minor detail to quietly skip.
4. **Default state and persistence.** Enabled by default? What volume? Session-only, or persisted (localStorage, a user setting, something else)? Don't assume a mechanism.
5. **Hover sounds.** If hover-triggered sound is on the table, flag that it's the easiest way for audio feedback to become annoying — make it an explicit opt-in, never bundled by default alongside click/toggle sounds.
6. **CLI shell environment.** Interactive terminal, or non-interactive (CI, an agent sandbox)? Determines whether the workaround below is needed up front.

## Install

```
<pkg-manager> add @web-kits/audio
```

npm, pnpm, yarn, and bun all work.

## Vanilla API

- `defineSound(definition)` → returns a play function.
- `ensureReady()` — call once, on a user gesture (click/keydown). Browsers block audio until a gesture fires; skipping this makes the first sound silently fail.
- `loadPatch(source)` / `definePatch(data)` — a patch is a named JSON collection of sounds: `{ name, sounds, $schema?, author?, version?, description? }`.

## CLI

```
npx @web-kits/audio add <source>
```

`<source>`: omitted (interactive registry browse), a local path, an `owner/repo` GitHub shorthand, or a direct JSON URL. Flags: `--patch <name>`, `-y`/`--yes`, `-l`/`--list`. Installs into `.web-kits/` as generated typed modules (`<slug>.ts` plus a barrel `index.ts`) — treat this directory as generated code: exclude it from lint/format tooling, don't hand-edit it.

**Undocumented bug:** on first run, the CLI always prompts interactively for the output directory and ignores `-y`/`--yes` entirely. In a non-interactive shell this crashes with `SystemError [ERR_TTY_INIT_FAILED]`, reported misleadingly as `Failed to install <patch>: ...`. Workaround — before running `add` in CI or an agent sandbox, pre-create:

```json
// .web-kits/config.json
{ "output": ".web-kits" }
```

The CLI finds the existing config and skips the prompt.

## Framework adapters

Every adapter follows the same shape: a provider holding shared `enabled`/`volume` state (controlled — the app owns the state, the library just reads it), plus a hook/composable that reads that state to gate playback. The React adapter (`@web-kits/audio/react`) is the reference:

- `SoundProvider` — props `enabled`/`volume` (default `true`/`1`), `onEnabledChange`/`onVolumeChange`.
- `useSound(definition)` — stable play function; respects the provider's enabled/volume, and **independently checks `prefers-reduced-motion` regardless of `enabled`**.
- `usePatch(source)`, `useSequence(steps, options)`, `useAnalyser(options)`, `useListener(listener)`.

For other frameworks, check the live docs for the equivalent composable names — the provider+hook pattern should still hold.

## The non-hook trap

Enabled/volume/reduced-motion gating lives inside the hook/composable, which only works inside a component render. A vanilla `defineSound()` call from outside any component — e.g. wrapping a toast library's own singleton `toast()` API — gets none of that gating for free. If a call site like that needs to respect the same settings, it has to re-implement the check by hand (read the persisted enabled/volume state directly, check `matchMedia('(prefers-reduced-motion: reduce)')`). Flag this to the user rather than silently shipping a sound that ignores mute or reduced-motion.
