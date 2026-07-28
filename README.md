<p align="center">
  <img src="./public/logo.svg" alt="Reway logo" width="72" height="72" />
</p>

<h1 align="center">Reway</h1>

<p align="center">A personal bookmark manager for people who save often and retrieve constantly.</p>

Reway is designed to make saving links immediate and retrieval calm. It brings bookmarks, collections, tags, visual metadata, and browser-session capture into one private library instead of leaving saved links spread across tabs and browser folders.

> Current status: this checkout is an early UI build. The product backend, authentication, Chrome extension, and live bookmark flows are specified but are not yet implemented here.

## What Reway is

Reway is a capture-first bookmark product with two planned surfaces:

- a web dashboard for searching, scanning, organizing, and opening a personal library;
- a Chrome Manifest V3 extension for saving the current tab, a selection of links, or an open browser window.

The product contract is built around one rule: saving should finish first. Titles, favicons, and images can follow in the background without blocking the save or turning enrichment into a page-level loading state.

## What exists in this repository

The current implementation is a disposable UI foundation, not a connected product release.

- `/ui` is a noindex component audit page covering the installed UI primitives.
- `/dashboard-ui` is a noindex dashboard shell wireframe using mock bookmarks, collections, and tags.
- The dashboard wireframe includes a collapsible sidebar, command search, sort controls, list view, compact grid view, and image-led grid view.
- Bookmark rows and cards share desktop menus, context menus, and mobile drawers for actions such as editing, tagging, collection changes, selection, re-enrichment, and deletion.
- Theme state supports light, dark, and system preferences.
- Sound feedback is wired into supported interactive primitives through `@web-kits/audio`.
- The repository has a small Vitest suite and a CI workflow that runs checks, tests, and a production build.

The root route still shows the starter page. The dashboard wireframe is intentionally kept outside the real dashboard route so the shell can be tested and changed before backend work begins.

## Product scope

The approved feature contract covers the following work. These are product requirements, not claims that the current checkout already ships them.

- Quick save from the extension, including saving a browser window as a collection.
- A private, searchable library of bookmarks, collections, and tags.
- Keyboard-first command search with inline URL capture.
- List, compact grid, and image-led grid views.
- Background metadata enrichment through a Supabase Edge Function, with quiet card-level pending and failed states.
- Supabase-authenticated data access and Realtime updates filtered to the signed-in user.
- Collection-local sorting, custom reorder mode, bulk actions, Trash, and account settings.
- X bookmark saving and the two approved V1 import paths: archive upload and opt-in scroll capture.

See the [feature contract](./spec/integrations/features/feature-contract.md) for the full behavior and data-boundary rules.

## Current limits

This repository does not currently contain:

- Supabase client, schema, migrations, Edge Functions, or authentication flows;
- the Chrome extension source;
- live bookmark data or a connected dashboard route;
- production deployment configuration;
- a finished public marketing site.

The mock dashboard demonstrates interaction shape and UI composition only. It should not be read as proof of a working backend, account system, or production release.

## Run the current build

Requirements: Node.js and pnpm.

```bash
pnpm install
pnpm dev
```

Then open:

- `http://localhost:3000/` — starter route
- `http://localhost:3000/ui` — component audit
- `http://localhost:3000/dashboard-ui` — dashboard shell wireframe

## Verify the repository

```bash
pnpm run check
pnpm run test
pnpm run build
```

CI runs the same quality checks, tests, and build on pushes to `main` and on pull requests. The current quality baseline is the UI foundation; it does not validate the unimplemented backend or extension scope.

## Technology

The current UI foundation uses:

- TanStack Start and TanStack Router
- React 19, TypeScript, and Vite
- Tailwind CSS v4
- local coss UI components with Base UI primitives where needed
- Phosphor Icons and Cal Sans
- Motion for selected interface transitions
- `@web-kits/audio` for UI sound feedback
- Vitest, oxlint, oxfmt, and React Doctor

The planned product architecture adds Supabase for authentication, database access, Realtime, Storage, and Edge Functions. Those services are defined in the product and feature specs but are not part of the current implementation inventory.

## Project documentation

- [Product DNA](./spec/identity/project-dna.md) — purpose, audience, product model, constraints, and implementation posture
- [Brand voice](./spec/identity/brand-voice.md) — product language and wording boundaries
- [Design language](./spec/identity/design-language.md) — visual and interaction direction
- [Feature contract](./spec/integrations/features/feature-contract.md) — approved product behavior and technical boundaries
- [Integration docs](./spec/integrations/README.md) — third-party integration routing
- [Session records](./spec/sessions/README.md) — verified short-lived project state
