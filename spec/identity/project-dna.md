# Project DNA

## Reway

Reway is a personal bookmark manager for people who save often and retrieve constantly. It captures open tabs and individual pages into a synced, searchable, visually organized library across a web dashboard and Chrome extension, so saving never feels like throwing things away.

### Core Purpose

**For external users:** Reway makes saving links instant and calm, then restores structure through grouping and enrichment so retrieval is effortless.

**For internal users:** Reway provides a clear capture-to-enrichment pipeline, strict user-scoped authentication boundaries, and predictable UI surfaces across the dashboard and extension.

This project is not meant to become:

- A generic workspace, knowledge base, or all-purpose productivity tool.
- A thin browser-folder replacement with no enrichment or cross-device library.
- A general-purpose whiteboard or diagramming tool. Canvas organizes and launches bookmark references; nodes are never freeform content. React Flow drawing tools are subscription-gated.

> **The Central Mechanism** — Capture first. Organize immediately or later. Enrichment happens asynchronously, so a save is instant and the library improves in the background without blocking the user or flooding the interface with loading states.

### Product Model

**What it is:**

- A capture-first bookmark OS across web and Chrome extension.
- A searchable, visual personal library for saved links.
- A calm retrieval tool built around bookmarks, collections, tags, and familiar visual cues.

**Core truths that guide every decision:**

- Save latency must be zero; enrichment can lag.
- User data is private by default and always authentication-scoped.
- Visual scanning is a first-class retrieval aid. People recognise links by favicon and image before URL text.
- Organization should help after capture, never delay it.

**Signature mechanics:**

- Immediate save with asynchronous title, favicon, and OG-image enrichment.
- One command surface for library search and direct URL add.
- Valid URLs pasted outside editable dashboard controls save immediately; discovery guidance belongs in the command surface footer.
- Extension-first capture for one tab, all open tabs, or selected links through contextual entry points.
- One library for bookmarks, collections, and tags.
- List and compact grid views with and without images.
- Collection-local sorting by date added, most visited, alphabetical, or custom order; All Bookmarks uses system sorts only.

### Target Audience

#### External

- Researchers and knowledge workers.
- Developers and designers collecting references.
- Heavy tab users preserving browser sessions.
- People frustrated by browser-native bookmarks.

**Profile:** Ages 18–45, desktop-first and moderately technical. They need fast capture, fast retrieval, and the feeling that their library is calm, organized, and under their control.

#### Internal

- Product, design, engineering, support, and operations.

**Profile:** High technical comfort. Internal contributors need predictable TanStack Start patterns, authentication-bound Supabase data access, and dashboard surfaces that scale to large libraries without regressing the experience.

### Non-Negotiable Principles

1. No unscoped data mutations. Every bookmark, collection, tag, preference, and destructive action is bound to the authenticated user and enforced by Supabase.
2. No blocking saves on enrichment. Bookmark insertion and durable enrichment queueing complete before metadata work starts; failures appear only as a small card-level indicator, never a toast.
3. No unbounded enrichment retries. Reway makes at most three attempts for transient delivery or fetch failures, with bounded backoff and jitter. Permanent failures stop at once. Users may manually re-enrich a bookmark from its overflow menu.
4. No misleading collaboration, AI, or workspace positioning. Reway is a personal library.
5. No stack-first messaging on broad website surfaces. Tools are proof only after the outcome is clear.

### Product Differentiators

| Area | Common pattern | Reway |
| --- | --- | --- |
| Capture flow | Save into browser-local folders | Save from the web app or extension into a synced personal library |
| Post-save quality | Raw URL or weak title metadata | Asynchronous enrichment for title, favicon, and OG image |
| Session handling | Tabs disappear with the session | Current-window tabs become a persistent collection in one action |
| Retrieval | Folder scrolling and list view only | Command search, visual views, tags, collections, and sorting |
| Visual identity | Generic bookmark UI | Strong branding, curated themes, iconography, and a polished interface |

### Architecture & Constraints

- Supabase authentication boundaries are non-negotiable; every mutation is user-scoped.
- Dashboard preferences are cookie-backed, validated against defaults, scoped to the `_dashboard` layout route, and never leak to the public site.
- Enrichment is secondary. New bookmarks may begin with minimal metadata.
- A bookmark insert creates its enrichment request and Supabase Queue message in the same database transaction. Batched Edge Function consumers perform enrichment independently of the browser. SSRF protection lives inside the worker before every connection and redirect.
- The dashboard receives extension saves and enrichment updates through Supabase Realtime subscriptions filtered by `user_id`.
- Chrome extension support targets Manifest V3 only.
- X bookmark import ships in V1 through archive-file upload and opt-in, user-initiated scroll capture. Both are explicitly disclosed and send only URLs to the backend.
- Website copy stays reader-centred and outcome-first. Technical details belong on proof, process, or capability surfaces, not the primary brand pitch.

### Technology Stack

The public brand does not lead with stack inventory. For implementation, use the repository as the source of truth.

**Core**

- TanStack Start, TanStack Router, TypeScript, React 19, and Vite.
- TanStack Query is planned for server-state and data fetching, but is not yet installed.

**Backend and data**

- Supabase for database, authentication, Realtime, Storage, and Edge Functions.

**UI and components**

- Local coss ui components under `src/components/ui`.
- Base UI when a lower-level accessible primitive fits better than a coss ui component.
- Phosphor Icons, and the Cal Sans family for typography: Cal Sans UI for body and brand text, Cal Sans Text for headings, and Cal Sans Geo for display, with JetBrains Mono for code.
- Any future font change must preserve the semantic body/heading/display split so the change stays centralized.
- Accessible, responsive, theme-aware UI.

**Interactions and state**

- TanStack React Hotkeys.
- React state for local UI state; external-store patterns when browser state is shared across components or tabs.
- TanStack Store and TanStack Pacer for batched visit tracking.

**Tooling**

- pnpm, oxlint, oxfmt, TypeScript, Vitest, and React Doctor.

### Working Posture for Agents

Agents working in this repository should think in this order:

1. Does this decision protect capture-first and zero-latency save?
2. Who owns this surface: dashboard, extension, or both?
3. Is every mutation user-scoped and Supabase-auth enforced?
4. If enrichment is involved, is it asynchronous and non-blocking?
5. If Realtime is involved, is the subscription filtered by `user_id`?
6. Does the copy lead with the user's outcome before technology?
7. Is the system becoming clearer or more mixed?

Agents should behave as system-design partners first and implementation agents second.
