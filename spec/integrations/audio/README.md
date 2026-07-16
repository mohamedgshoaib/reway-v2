# Audio

Start here for how `@web-kits/audio` (declarative Web Audio synthesis) is wired into Reway.

- `provider-setup.md` — `SoundProvider`, persisted enabled/volume state, `ensureReady` gesture wiring
- `patch-minimal.md` — the installed "Minimal" sound patch, the CLI, and a CLI bug workaround
- `component-wiring.md` — which shared UI components play which sounds, and why others were left out
- `open-items.md` — what's required before this ships to real users

Read this folder before adding a new sound trigger to a shared component, changing default volume/enabled state, upgrading the patch, or building a mute/volume control.
Do not use this folder for brand voice, visual design tokens, or unrelated third-party integrations (see `spec/integrations/README.md`).

## Summary

- Library: [`@web-kits/audio`](https://audio.raphaelsalaja.com/) — sounds are declared as plain objects (oscillators, envelopes, effects), not built with raw Web Audio API calls.
- Patch in use: **Minimal** (26 sine-based sounds), installed via the CLI into `.web-kits/minimal.ts`.
- State: enabled (default `true`) and volume (default `0.5`) are owned by the app, persisted to `localStorage`, and synced across tabs — the same pattern as `src/components/providers/theme-provider.tsx`.
- Reduced motion: the library's `useSound`/`usePatch` hooks independently check `prefers-reduced-motion` and silently no-op regardless of the enabled/volume state. This is handled inside the library, not by our provider.
- No mute/volume control UI exists yet. See `open-items.md`.
