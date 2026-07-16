# Open items

## Mute / volume control required before shipping to real users

There is no user-facing mute or volume control anywhere in the UI yet — no settings/preferences surface exists in the app. `SoundProvider` in `src/components/providers/sound-provider.tsx` owns `{ enabled, volume, setEnabled, setVolume }`; export a dedicated hook when a future control needs it.

**Sound defaults to on (`enabled: true`, `volume: 0.5`) for every visitor**, with no way for them to discover they can turn it off, until this exists. Do not let real user-facing pages accumulate more sound-wired interactions without also shipping a mute control — the gap widens the more components get wired.

Placement: TBD, alongside whenever the first real settings/preferences surface gets built. Don't build a settings panel just to hold this one control.

## Deferred component wiring

See `component-wiring.md` — accordion, collapsible, dialog, alert-dialog, drawer, sheet, dropdown-menu, tooltip, input/textarea key-press, and hover generally. Revisit deliberately per-feature, not opportunistically.
