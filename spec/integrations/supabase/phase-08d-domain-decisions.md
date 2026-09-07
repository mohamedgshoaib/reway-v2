# Phase 8D domain and adapter decisions

## Status

- Approved on 2026-09-07.
- The decision pass is complete.
- Implementation completed on 2026-09-07.
- The `/library` route, domain interface, in-memory adapter, Supabase adapter,
  migration, hosted types, and focused checks are complete.
- Phase 8D stops before durable queues and Phase 8E.

## Route and visual contract

- Rename the app route directly from `/dashboard-ui` to `/library`.
- Rename `src/routes/dashboard-ui.tsx` to `src/routes/library.tsx` and change its
  `createFileRoute` path. Let TanStack Router regenerate `src/routeTree.gen.ts`.
  Never edit the generated route tree by hand.
- Do not keep a `/dashboard-ui` redirect or alias. The project is not deployed.
- Keep rendering the same `DashboardUiPage` with the same props. Do not change
  its markup, classes, layout, state, animation, copy, or behavior during the
  route rename.
- Keep `src/dev/dashboard-ui/` in place during Phase 8D. Moving that directory
  would create broad import churn without helping the adapter work.
- The only visible Phase 8D change is the URL. Phase 8J owns the later live-data
  replacement and its UI regression checks.

## Phase boundary

- Phase 8D creates framework-free domain models, one library interface, and
  matching in-memory and Supabase adapters.
- Implement only behavior that both adapters and the current database can
  support now.
- Defer quick save, re-enrichment delivery, queues, import, export, restore,
  Realtime reconciliation, authentication routes, account replacement, and UI
  mock replacement to their assigned later phases.
- Do not define speculative job or transfer interfaces before their real
  implementations exist.

## Module ownership

- `LibraryAdapter` owns bookmarks, collections, tags, search, Trash, ordering,
  dashboard preferences, and visit recording.
- `AccountAdapter` owns authentication, profile identity, avatars, onboarding,
  fresh authentication, session revocation, and account deletion.
- Phase 8D implements `LibraryAdapter`. It does not replace the existing account
  seam.
- Keep collection hierarchy, URL handling, ordering, and display calculations
  in focused pure modules behind the library interface. Do not copy those rules
  into either adapter.

## Library interface

Use one small framework-free interface:

```ts
interface LibraryAdapter {
  read(request: LibraryReadRequest): Promise<LibraryReadResult>
  mutate(command: LibraryCommand): Promise<LibraryMutationResult>
}
```

- Use discriminated request, command, and result unions. Do not add separate
  bookmark, collection, and tag adapters.
- Do not depend on React, TanStack Query, route objects, toasts, or browser DOM
  APIs. Phase 8J may wrap this interface with TanStack Query.
- Scope the adapter when it is created. No read or mutation accepts `userId`.
- `createSupabaseLibraryAdapter(client)` accepts a session-scoped typed Supabase
  client. The request server client handles SSR reads, and the browser client
  handles later browser navigation and mutations through the same adapter.
- Never pass the secret or worker client into `LibraryAdapter`. Privileged
  worker and maintenance modules remain separate.

## Domain types

- Return Reway domain objects, not generated Supabase row types.
- Domain fields use camel case. The Supabase adapter alone maps database column
  names, nullable values, and generated fields.
- Use entity-specific opaque string types for bookmark, collection, and tag IDs.
  Database bigint IDs become decimal strings at the adapter edge. UUID-backed
  IDs in later phases follow the same string convention.
- Use a typed epoch-millisecond number for domain timestamps. Convert
  `timestamptz` values once at the adapter edge.
- IDs remain readable at runtime and stay out of user-facing copy unless a
  support or debug flow needs them.

## Read contract

`LibraryReadRequest` supports these variants:

- `bookmarks`: one keyset page for the active destination and sort.
- `collections`: one keyset page for collection navigation.
- `tags`: one keyset page for tag navigation.
- `bookmark-detail`: tags and collection memberships for one bookmark, loaded
  only when its menu or editor needs them.
- `search`: grouped bookmark and collection matches.
- `preferences`: dashboard view, sort, order, and disclosure preferences.

### Bounds

- Bookmark, collection, and tag pages contain 48 items by default.
- The adapter rejects a requested page size above 96.
- Phase 8J prefetches the next page before the last 12 loaded items enter view.
- Collections and tags use separate cursors because their sort modes differ.
- Do not load all bookmarks, collections, or tags into browser memory.
- Search returns at most 32 bookmark matches and 16 collection matches. Keep the
  current visible group order: Bookmarks, then Collections.
- Preserve the current command menu's grouping and path labels. If a ranking
  choice would change visible behavior, return for approval before wiring it.

### Cursors

- Cursors are opaque strings. Callers pass them back unchanged.
- Encode the active sort values and stable item ID needed for keyset pagination.
- Validate each cursor against its request kind, destination, and sort.
- Reject malformed or mismatched cursors as `invalid_input`.
- Apply a small encoded-length guard so cursor parsing remains bounded.

### Query shape

- Use direct RLS-protected table queries for bookmark, collection, tag, and
  preference reads.
- Simple bookmark pages may return in one query. Collection, tag, custom-order,
  and Most Visited paths may fetch ordered IDs first, then hydrate only those 48
  bookmarks with bounded parallel queries.
- Routine bookmark pages do not hydrate every tag and collection membership.
  `bookmark-detail` loads those relations for one bookmark on demand.
- Preserve the requested ID order after hydration with one map and one pass.

## Search database function

- `private.bookmark_search` stays private and unreadable to authenticated table
  clients.
- Add a narrow authenticated `search_library` database function through the
  Phase 8D library-interface migration. It returns only the safe bookmark and
  collection fields needed by the command menu.
- Derive ownership from `auth.uid()`. Do not accept `userId`.
- Keep any required security-definer helper in the private schema, fix its
  search path, check the caller, revoke default execution, and grant only the
  public wrapper or required role.
- Keep the public function security-invoker when the checked private-helper
  pattern can support it. Do not expose the private search table or use the
  secret client in the browser.
- Use the existing full-text and trigram bookmark indexes. Add a collection-name
  search index only if the implemented query and plan require it.
- Validate query text and result limits inside the database function.
- Run query plans with the existing 100,000-bookmark fixture before accepting
  the search query.

## Mutation contract

- Simple one-row writes may use direct RLS-protected mutations.
- Multi-row rules use the existing public database functions. Do not reproduce
  hierarchy, Trash, ordering, ownership, or set-membership rules in TypeScript.
- Add one checked atomic database function for replacing a bookmark's tags. The
  current schema exposes direct junction writes but has no public function for
  the delete-and-insert product action. Do not implement that action as two
  client transactions.
- Phase 8D covers collection and tag create, edit, delete, reorder, and
  rebalance; bookmark title and URL edits; tag and collection membership;
  Trash, restore, delete forever, collection-local reorder and rebalance;
  dashboard preference writes; and visit recording.
- Quick bookmark creation and manual re-enrichment remain deferred until their
  queue and delivery contracts exist.

### Success results

- Single-row creates and edits return the authoritative domain object and its
  new row version.
- Reorder and rebalance return the new scope version.
- Bulk mutations return `affectedCount` and `requiresRefetch: true`.
- Delete results include the affected count and echo the target IDs needed for
  local cleanup. They do not return the full library.
- The adapter maps generated RPC result types to these domain results.

### Errors

- Both adapters reject with `LibraryError`. Never expose raw Supabase errors or
  require callers to match database messages.
- Stable codes include `not_found`, `conflict`, `invalid_input`, `forbidden`,
  `offline`, and `unexpected`.
- Each error states whether Retry is safe.
- Include user-safe wording only when the domain owns it. Keep technical causes
  in server diagnostics and out of browser state, toasts, specs, and snapshots.

## Adapter parity

- The in-memory adapter owns deterministic fixture state and returns the same
  domain results and errors as the Supabase adapter.
- The Supabase adapter receives a typed client dependency. It does not create a
  browser, server, or worker client itself.
- Contract checks cover the changed high-risk behavior rather than every field
  permutation.
- Use the secret client only for private setup or inspection when useful. A
  secret-client success never proves authenticated RLS behavior because that
  client bypasses RLS.

## Verification

- Run focused domain and adapter contract tests for changed behavior.
- Run `pnpm run db:check:phase8c` only when Phase 8D changes SQL or generated
  schema behavior.
- Use one rollback-only hosted smoke check for Supabase behavior that local
  tests cannot prove.
- Run Supabase security and performance advisors once after the final database
  change.
- Regenerate `src/types/database.generated.ts` after the hosted migration.
- Run `pnpm run check` and `git diff --check` at the phase checkpoint.
- Run the production build, secret scan, or broader tests only when the changed
  scope can affect them. Do not run React Doctor unless React files change.
- Browser, touch, keyboard, screen-reader, contrast, and screenshot checks still
  require explicit permission. Do not claim pixel equality without such a
  rendered check.

## Complexity contract

- Route selection, branded ID handling, adapter dispatch, and error mapping are
  constant-time per call.
- Domain conversion is linear in the returned page and uses linear page memory.
- Indexed keyset pages cost `O(log N + P)` plus returned rows, where `P` is at
  most 96 and normally 48.
- Reordering a hydrated page by ID costs `O(P)` time and memory.
- `bookmark-detail` costs `O(T + C)` for that bookmark's tag and collection
  memberships only.
- Indexed search work is bounded by its query plan and 48 returned results.
- Bulk mutation work is `O(K)` in selected IDs. Do not add a hidden normal
  selection limit. Return for a product decision if measurement needs one.
- No Phase 8D read or result returns the complete bookmark library.

## Implementation order

1. Inspect the dirty worktree and preserve the completed Phase 8C changes.
2. Rename only the route to `/library`; keep the rendered component unchanged.
3. Add domain types, `LibraryError`, cursor helpers, request and command unions,
   and the framework-free `LibraryAdapter` interface.
4. Add the deterministic in-memory adapter and focused contract tests.
5. Add Supabase row mappers and the session-client adapter in read-only slices:
   preferences, paged collections and tags, bookmark pages, then bookmark
   detail.
6. Create one reviewed library-interface migration with the checked
   `search_library` and atomic bookmark-tag replacement functions. Test both,
   apply once, regenerate types once, and add their adapter paths.
7. Add schema-backed mutations in small groups: simple edits and preferences,
   memberships and Trash, ordering, then visit recording.
8. Run the lean verification gate, update the Phase 8 record, and stop before
   Phase 8E.

## Rejected alternatives

- Do not keep `/dashboard-ui` as the final app URL.
- Do not use `/bookmarks`; it excludes collections, tags, Trash, search, and
  settings. Do not use the generic `/dashboard` name.
- Do not move the whole dashboard directory during the route rename.
- Do not create separate bookmark, collection, and tag adapters.
- Do not expose generated Supabase row types to React callers.
- Do not use number IDs or accept caller-supplied owner IDs in domain requests.
- Do not load the full library or all navigation data into memory.
- Do not make `LibraryAdapter` depend on TanStack Query.
- Do not use the secret client as a shortcut around user-scoped RLS paths.
- Do not replace the visible mock dashboard before Phase 8J.
