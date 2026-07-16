# Provider setup

## Files

- `src/components/providers/sound-provider.tsx` — app-owned `SoundProvider` wrapping `@web-kits/audio/react`'s `SoundProvider`
- `src/lib/sound-settings.ts` — shared, non-React storage/read helpers (localStorage keys, defaults, `prefersReducedMotion()`)
- Wired into `src/routes/__root.tsx`, inside `ThemeProvider`, wrapping the rest of the app

## State model

`@web-kits/audio`'s `SoundProvider` is a controlled component: it takes `enabled`/`volume` props and `onEnabledChange`/`onVolumeChange` callbacks, and the app owns the actual state.

Our `SoundProvider` follows the same pattern as `ThemeProvider`:

- `enabled` and `volume` are read from `localStorage` (`sound-enabled`, `sound-volume`) via `useSyncExternalStore`, not `useState`, so state stays consistent if the same site is open in multiple tabs.
- A custom `sound-storage-change` window event (mirroring `src/components/providers/theme-provider.tsx`'s `THEME_STORAGE_EVENT`) notifies the current tab immediately on change; the native `storage` event only fires in *other* tabs.
- Defaults: `enabled = true`, `volume = 0.5` (see `component-wiring.md` and `open-items.md` for why enabled-by-default was chosen despite no mute control existing yet).
- `SoundProvider` keeps `{ enabled, volume, setEnabled, setVolume }` in its private context. Export a dedicated hook only when a mute or volume control needs it; no user-facing control exists yet.

## First-gesture unlock

Browsers block audio playback until a user gesture (click/keydown) occurs. `SoundProvider` attaches one-time `pointerdown`/`keydown` listeners on `document` that call `ensureReady()` (from `@web-kits/audio`) and then detach. This runs once per page load, app-wide — individual components don't need to think about it.

## Reduced motion

`@web-kits/audio/react`'s `useSound`/`usePatch` hooks call `usePrefersReducedMotion()` internally and no-op regardless of the `enabled`/`volume` state passed to `SoundProvider` (verified by reading `node_modules/@web-kits/audio/dist/react.js`). Our provider does not duplicate this check for hook-based usage — it's redundant.

The one place it's **not** covered by the library: `src/components/ui/sonner.tsx`'s toast sounds, which don't go through `useSound` (see `component-wiring.md` for why). That file checks `prefersReducedMotion()` from `sound-settings.ts` manually.

## Path alias

`tsconfig.json` has `@sounds/*` → `./.web-kits/*`, so components import sounds as `import { click } from "@sounds/minimal"` instead of counting relative `../../` segments. Deliberately not `@web-kits/*` — that would collide with the real npm package's import specifier (`@web-kits/audio`, `@web-kits/audio/react`).
