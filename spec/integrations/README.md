# Integrations and Feature Contracts

Start here for third-party integration specs and durable feature contracts.

- `audio/` — `@web-kits/audio` UI sound feedback
- `features/` — Reway's current product feature contract and technical behaviour boundaries
- `supabase/` — Phase 8 backend, durability, capture, transfer, and Realtime plan

Each third-party integration gets its own subfolder with a `README.md` router. Feature contracts may live under `features/` when they need an authoritative technical and product record before a dedicated domain spec exists.

Read this folder before adding, removing, or changing a third-party integration, or when implementing behaviour recorded in a feature contract.
Do not use this folder for brand voice, visual design decisions, or session continuity.
