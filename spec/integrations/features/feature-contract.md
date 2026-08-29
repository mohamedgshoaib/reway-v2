# Reway Feature Contract

This is the authoritative record of Reway's approved feature behaviour and technical constraints. Preserve the details here unless an explicit product decision changes them.

## Capture

### Quick Save

- Save the current active tab via the extension popup in one click.
- No required fields. Collection selection is optional.

### Session Save

- Save all open tabs in the current browser window as a new collection or into an existing collection.
- One action converts an entire session into a persistent group.
- Cap a session save at 50 tabs. If the window has more, save only the first 50.
- Duplicate URLs are allowed, consistent with the library-wide allow-duplicates policy.

## Library & Organization

### Bookmarks

- Bookmarks are the base unit.
- Each bookmark stores URL, asynchronously enriched title, favicon, OG image, tags, collection membership, and custom order index.
- Each bookmark carries `metadata_status` with one of `pending`, `enriched`, or `failed`; it drives the card-level indicator.
- A bookmark may belong to multiple collections simultaneously.
- Every bookmark card exposes one consistent overflow menu: a three-dot button and right-click context menu across list and grid views.
- The shared menu is the single entry point for all secondary actions: selecting, unselecting, and searching tags; add to collection; copy URL; open in new tab; move to collection; delete; edit; select multiple; and re-enrichment (refetch).

### Enrichment pipeline

- A Supabase Edge Function is triggered by a DB webhook on `INSERT` into `bookmarks`.
- Enrichment runs server-side and independently of the browser session. It completes even if the user closes the tab immediately after saving.
- On completion, the Edge Function writes title, favicon, OG image, and `metadata_status = 'enriched'`.
- On failure, the Edge Function sets `metadata_status = 'failed'`.
- There are no automatic retries.
- A user may manually trigger re-enrichment from the bookmark overflow menu. It re-invokes the Edge Function for that bookmark ID.
- Before manual re-enrichment, the client resets `metadata_status` to `pending` so the card immediately shows the in-progress state.

#### SSRF protection

- SSRF protection lives inside the Edge Function, in one place for every save path including the extension.
- Before any fetch, enforce scheme validation for `https` and `http` only, parse the hostname, and block private and localhost IP ranges.

#### Why enrichment is not a TanStack server function

- Client-session coupling is disqualifying: if the tab closes before a second RPC fires, enrichment is silently lost.
- On the developer's current Vercel Hobby plan, tighter function-duration limits compound the issue and enrichment competes with SSR traffic on the same runtime.

### Extension ↔ Dashboard Realtime Sync

- The dashboard subscribes to Supabase Realtime `postgres_changes` on `bookmarks`, filtered by `user_id=eq.<uid>`.
- `useRealtimeBookmarks.ts` manages the subscription and is mounted in `_dashboard.library.tsx`.
- When the extension saves a bookmark, the dashboard receives two automatic events:

  1. `INSERT`: the bookmark appears immediately with raw URL and title and `metadata_status = 'pending'`.
  2. `UPDATE`: the Edge Function completes enrichment and writes back. The card updates with title, favicon, OG image, and `metadata_status = 'enriched'` or `failed`.

- No polling and no manual refresh.

#### Required setup

- RLS `SELECT` policy on `bookmarks`: `TO authenticated USING ((select auth.uid()) = user_id)`.
- Add `bookmarks` to the `supabase_realtime` publication: `ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks`.
- The client subscribes to `event: '*'`, filtered by `user_id=eq.<uid>`.

#### RLS caveat

- Realtime does not apply RLS to `DELETE` events.
- This is not a cross-user leak concern because users can delete only their own bookmarks.
- The client-side DELETE handler must not treat the payload as an authorization signal.

### Collections

- Collections are user-managed bookmark groups. A bookmark may belong to more than one collection.
- A collection has a required name and one icon. New collections use the Folder icon by default.
- Collection names are trimmed, collapse repeated inner spaces, preserve case and supported punctuation, and allow Unicode including Arabic and accented characters.
- Collection names have a 24-character limit and must be globally unique within the user's library after case-insensitive comparison and surrounding-space removal.
- Collection names reject line breaks and control characters.
- The collection icon picker contains 24 icons in four single-open, collapsible groups of six:
  - General: Folder, Bookmark, Archive, Star, Heart, Stack.
  - Work: Briefcase, Person, Buildings, Calendar, Clipboard, X logo.
  - Learning & Creative: Book, Notebook, Research, Paintbrush, Code, Camera.
  - Personal: Home, Cooking, Travel, Location, Shopping, Fitness.
- Icon search covers every group and supports plain-language aliases such as `recipe`, `job`, and `trip`.
- General opens by default. Clearing icon search restores the group that was open before search.
- The selected collection icon appears in the desktop sidebar, collapsed rail, mobile drawer, command search, collection pickers and menus, create and edit previews, and delete confirmation.
- System destinations keep their fixed icons.
- `X Bookmarks` starts with the X logo when X creates it. It remains editable and uses normal collection deletion rules. A later X save recreates a missing `X Bookmarks` collection with the X logo.
- Session-created collections start with the Folder icon.

### Collection Hierarchy

Reway allows one level of collection nesting. This gives large libraries one useful grouping step without adding deep trees, hidden collection state, or repeated menu navigation.

The contract follows five interaction rules:

- A collection row keeps one primary job: open that collection.
- Parent and child membership stays direct so nesting does not change the meaning of counts, search results, or saved bookmarks.
- The sidebar favors visible structure, while destination pickers use one level of disclosure to conserve space.
- Each menu row has one result: perform an action or open a submenu, never both.
- The interface prevents invalid or destructive hierarchy changes before commit. Only import may flatten a source tree, and it must report what changed.

- The hierarchy has two tiers: a top-level collection and an optional child collection.
- A collection stores an optional user-scoped `parent_id`. A null parent means top level.
- A child cannot contain another collection. A top-level collection that already has children cannot become a child until those children move elsewhere or return to the top level.
- Top-level and child collections remain normal bookmark destinations. Clicking either row opens that collection.
- A collection page and its sidebar count include only bookmarks assigned directly to that collection. Child memberships never roll up into the parent.
- Outside the expanded sidebar and a submenu that already names the parent, a child collection uses its full path, such as `Media / Streaming Platforms`.
- Children remain visible beneath their parent whenever the Collections section is open. Individual collection rows do not expand or collapse and do not show disclosure carets.
- The Collections section remains the single disclosure control for the complete collection list.
- The sidebar structure follows the always-rendered nested-list pattern in shadcn/ui `sidebar-03`. The per-parent collapsible navigation in `sidebar-07` does not fit because collection rows remain navigation targets and their children stay visible. Its separate row-hover action remains a useful menu reference.
- The shadcn/ui blocks are structural references only. Reway reuses its TanStack Start, Phosphor, and local sidebar primitives rather than copying their Next.js, Lucide, or `asChild` setup.
- Linear's sidebar supports the interaction direction: section-level disclosure sits beside the section label, while a row-wide hover or focus reveals that row's menu. Reway does not copy Linear's team grouping semantics.
- Import flattening is the only operation allowed to remove excess hierarchy. Manual create, edit, and drag operations never flatten existing collections.
- When an imported path exceeds the depth limit, Reway keeps the first two tiers, does not create deeper collection nodes, and assigns every deeper descendant's bookmarks to the nearest retained child.
- For example, importing `Media / Streaming Platforms / TV Shows / Drama` creates `Media / Streaming Platforms`; bookmarks from `TV Shows` and `Drama` join `Streaming Platforms`.
- The import summary names each flattened source folder and the retained collection that received its bookmarks. Global collection-name uniqueness also applies to imports, and the import must surface name conflicts before commit.
- One collection-hierarchy module owns depth validation, paths, visible projections, import flattening, deletion calculations, and parent changes. The sidebar, search, pickers, and import flow consume that shared interface instead of rebuilding the rules.

### Tags

- Tags are flat user-managed labels assigned to bookmarks.
- Tag names follow the same normalization, character, 24-character, and uniqueness rules as collection names.
- Every tag uses the fixed tag-chevron icon. Tags do not support custom icon selection.
- A tag has one color identity chosen from Neutral, Red, Orange, Amber, Lime, Green, Teal, Cyan, Blue, Indigo, Violet, or Rose, or from a custom color picker.
- New tags use the least-used palette color. Palette-order priority breaks ties.
- The chosen hue uses a darker value in the light theme and a lighter value in the dark theme.
- The custom picker includes a color area, hue slider, fixed HEX input, and eye dropper when supported. It does not include alpha.
- A custom color shows the exact source swatch and a current-theme tag icon preview.
- The colored tag-chevron icon appears wherever the tag appears, including the desktop sidebar, collapsed rail, mobile drawer, menus, filters, chips, command search, previews, and delete confirmation.
- Tag text, row backgrounds, and selected states remain neutral.
- Tag rows do not show bookmark counts.

### Collection and Tag Management

- Expanded collection and tag headers contain a disclosure trigger, a section menu, and a create button.
- The disclosure caret sits directly after the section label. The section menu and create button occupy fixed trailing slots.
- On desktop, the section menu appears when the section header receives hover or focus. It remains in a fixed trailing slot.
- On touch surfaces, the section menu remains visible.
- The collapsed desktop rail hides section headers, disclosure controls, create buttons, and section menus without leaving blank header space.
- The collapsed rail renders top-level and child collections as one flat icon list. Child tooltips use their full path, such as `Media / Streaming Platforms`.
- The collapsed rail also shows colored tag icons with tooltips. A quiet divider separates collections and tags.
- Mobile always uses the expanded navigation drawer. It keeps children visible and indented, and it keeps row menus available without hover.
- An empty expanded section keeps its header and shows one muted, non-interactive row: `No collections yet` or `No tags yet`.
- Create and edit use an anchored popover on desktop and a centered dialog over the still-open navigation drawer on mobile.
- Create and edit share one form body with a live sidebar-row preview, required name field, and optional appearance controls.
- The collection form shows the selected icon and a `Change icon` control. The grouped searchable icon picker expands inline.
- The collection form includes an optional `Parent collection` field. `Top level` is the default.
- Only top-level collections that can accept a child appear as valid parents. The current collection, child collections, and any choice that would exceed the depth limit remain unavailable with a short reason.
- The Collections header create button starts a top-level draft. A top-level collection row offers `New nested collection`, which opens the same form with that collection selected as the parent.
- Editing a child can move it to another valid top-level collection or back to `Top level`.
- Editing a top-level collection that already has children cannot assign it a parent. The editor explains that its children must move first.
- The tag form always shows the 12 palette choices. Selecting `Custom` expands the custom color picker inline.
- The editor uses a local draft. Visible stored values change only after Save.
- Save is available only when the draft is valid and changed. Enter submits from the name field.
- Cancel and Escape discard the draft.
- Outside press closes a pristine editor and does not close a dirty editor.
- A save error remains in the editor as inline feedback.
- Successful create and edit close immediately, update every visible instance optimistically, and show a named toast.
- A persistence failure rolls back the optimistic change and replaces the success toast with an error toast containing `Retry`.
- Retry reopens the editor with its preserved draft. A delayed failure never reopens an editor automatically.
- Successful edit toasts include `Undo`. Undo restores the complete prior name and appearance snapshot.
- Create, delete, order changes, reorder drops, and failures do not offer Undo.
- Toasts use one stable ID per managed item to replace prior feedback for that item.
- Creating from a section header returns focus to that header's create button, updates the section, and does not change the active destination.
- Creating from `New nested collection` returns focus to the parent collection's row menu action and places the new child in that parent's sibling order.
- Creating from a bookmark picker keeps the user in the current workflow and returns the new item selected or applied.
- A tag picker remains open after creation. Add-to-collection and Move-to-collection close after applying the new collection and return focus to the bookmark action.
- Mobile management actions keep the navigation drawer open. Normal navigation still closes the drawer.

### Collection and Tag Menus

- A collection row keeps its direct bookmark count in the trailing slot while inactive.
- On desktop pointer hover anywhere on the row, or when the row receives keyboard focus, the collection row replaces its count with an ellipsis button. The active collection keeps the ellipsis visible.
- Tag rows use the trailing slot for the ellipsis button and never show counts.
- Touch surfaces keep row ellipsis buttons visible.
- A top-level collection row menu contains `New nested collection`, `Edit`, a separator, and `Delete`. Child collection row menus omit `New nested collection`.
- Tag row menus contain `Edit`, a separator, and `Delete`.
- Right-click opens the same row menu on desktop.
- Mobile row and section menus use anchored, collision-aware menus above the open navigation drawer with 44-pixel action rows.
- Selecting Edit closes the menu before opening the centered editor dialog.
- Selecting Delete closes the menu before opening the confirmation dialog.
- Outside press or Escape closes only the open action menu.
- Add-to-collection and Move-to-collection use cascading menus when a top-level collection has children.
- The depth limit keeps these pickers to one submenu level instead of one long indented tree.
- The root menu and each child submenu use a collision-aware maximum height and scroll independently when their contents exceed the available space.
- A top-level collection with no children remains a direct menu action.
- A top-level collection with children uses its complete menu row as a submenu trigger. The caret indicates the deeper menu but is not a separate target.
- Fine pointers open the child menu after a 100-millisecond hover delay. Click, touch, and keyboard input also open it explicitly.
- The first submenu item is `Add to [parent]` or `Move to [parent]`. The remaining items are that parent's child collections.
- Choosing the parent action or a child destination closes the cascading menu and returns focus to the bookmark action.

### Collection and Tag Ordering

- Collections and tags each store an independent section order mode: Newest, Alphabetical, or Custom.
- Collections default to Newest. Tags default to Alphabetical.
- The collection order mode applies separately to the top-level list and to each parent's child list. Parents sort among parents; children sort only among their siblings.
- A parent and its children remain one visible block when the parent moves in the top-level order.
- The section menu contains an `Order by` radio group, then `Reorder collections` or `Reorder tags`.
- The reorder command is available only while the section uses Custom order.
- The first switch to Custom preserves the current visible order. Later switches restore the saved custom order.
- New items appear at the top of their sibling group in Newest and Custom order, and in their natural sibling position in Alphabetical order.
- Section order changes do not show a toast.
- Section reorder mode applies to one section at a time.
- The active section header becomes `Reordering collections` or `Reordering tags` with a `Done` button.
- Reorder mode hides the create control, section menu, collection counts, and row actions, and shows one trailing drag handle per item.
- Rows do not navigate during reorder mode. Other sections remain visible, and selecting another destination exits reorder mode.
- Pointer, touch, and keyboard input can reorder from the handle.
- Collection drag behavior exists only in explicit reorder mode. Normal navigation never starts a drag.
- Dropping between collection rows reorders within the current sibling group.
- Holding a dragged collection over the center of a valid top-level collection for 500 milliseconds reveals a named `Move into [collection]` target. Dropping there makes the source its child.
- Dragging a child reveals a `Top level` drop target for removing its parent.
- Child collections never accept nested drops.
- A top-level collection that already has children cannot be dropped into another collection because that would create a third tier. Nesting targets become unavailable and explain that its children must move first; ordinary reorder gaps remain active.
- This invalid nesting attempt never opens a confirmation and never flattens the source. A drag operation must not hide a destructive hierarchy change.
- Pointer and touch input start from the drag handle with input-specific activation constraints. Keyboard input reorders siblings from the handle; keyboard reparenting uses the Edit form's `Parent collection` field.
- The dragged row is opaque and appears once.
- Each drop saves optimistically.
- Done, Escape, collapsing the section, and closing the mobile drawer exit reorder mode without reverting completed drops.

### Collection and Tag Deletion

- Deleting a tag requires confirmation, permanently deletes the tag, and removes it from every bookmark. Bookmarks remain.
- The tag confirmation shows its colored icon, name, and affected bookmark count.
- Tag confirmation copy follows: `This tag will be removed from 14 bookmarks. This cannot be undone.`
- Deleting a collection requires confirmation and permanently removes the collection, its icon, its order, and its memberships.
- Deleting a top-level collection also permanently deletes every child collection beneath it. Children are not promoted to the top level.
- Cascade deletion is intentional because children remain visible under their parent before confirmation. It lets a user remove one complete collection group without deleting every child separately.
- After Reway removes every membership in the deleted collection subtree, bookmarks with no surviving collection membership move to Trash and remain recoverable for 30 days.
- Bookmarks that still belong to a collection outside the deleted subtree remain unchanged in those surviving collections.
- Restoring a bookmark that moved to Trash because all its collection memberships were inside the deleted subtree returns it as Uncollected.
- A leaf collection confirmation shows its icon, name, and exclusive bookmark count.
- A parent collection confirmation also shows the number of child collections that will be deleted and the number of bookmarks that will move to Trash after the full subtree is removed.
- Leaf confirmation copy follows: `The collection cannot be restored. 8 bookmarks that exist only in this collection will move to Trash.`
- Parent confirmation copy follows: `Media and its 3 nested collections will be permanently deleted. 18 bookmarks that exist only in these collections will move to Trash.`
- Delete confirmation does not require typed text.
- Pending deletion disables dismissal and the destructive button.
- Deleting an inactive item does not change the current destination.
- Deleting the active collection, or a parent of the active collection, returns the content pane to All Bookmarks.
- Deleting an active tag removes it from the OR tag filter, keeps any remaining tag filters, and returns to All Bookmarks when no tag filter remains.
- Focus returns to the relevant section header after deletion.
- Deletion shows a named toast. A parent collection deletion toast includes the number of collections deleted and the number of exclusive bookmarks moved to Trash.
- User collections and tags support management. All Bookmarks, Uncollected, Settings, Display, Trash, and other system destinations do not.

### Multi-Select & Bulk Actions

- Users may select multiple bookmarks to delete, move to another collection, add to a collection, or remove from the current collection.

### Drag and Drop Reorder

- Users enter a reorder mode to manually sort bookmarks within a collection.
- Custom order in a collection is independent of global All Bookmarks order.
- Per-collection sorts are date added, most visited, alphabetical, and custom order.
- Custom order uses fractional indexing through the `fractional-indexing` npm package. Only the moved item's `sort_order` updates: O(1) per reorder.
- Bulk additions use `generateNKeysBetween` to generate all keys in one call.
- If a `sort_order` string exceeds 50 characters after a reorder, the client rebalances the complete collection's keys in one batch update.
- All Bookmarks and Uncollected use system sorts only: date added, most visited, and alphabetical. Neither supports custom reorder.
- Uncollected uses a partial-index filter, `WHERE collection_count = 0`, which is O(K) for K uncollected bookmarks rather than a `NOT EXISTS` scan over the complete library.
- A trigger on `bookmark_collections` `INSERT` and `DELETE` maintains `collection_count`.

### View Modes

- List: favicon and title.
- Grid without image: compact 1–3 columns with favicon and title.
- Grid with image: compact 1–3 columns with OG image, favicon, and title.

## Retrieval & Navigation

### Command Search

- `Cmd+K` / `Ctrl+K` opens keyboard-first search and add.
- It searches bookmarks and collections and adds a new bookmark inline.
- Top-level collection results use the collection name. Child collection results use the full path, such as `Media / Streaming Platforms`.
- Collection search matches a child name and its parent path. Selecting a result opens that exact collection.
- Typing or pasting a URL into the command palette and pressing Enter saves it immediately with `metadata_status = 'pending'`.
- Quick add has no collection picker. The user can organize later.
- Database full-text search uses a `tsvector` over `(title, url, tags)` with a GIN index.
- The command palette queries Supabase directly and never loads the full library into memory.
- Client-side filtering applies only to an already-loaded current view, such as a visible collection; it never substitutes for full-library search.
- Add `pg_trgm` for fuzzy, typo-tolerant matching.

### Collection Hierarchy Feedback

- A parent with no direct bookmarks uses: `No bookmarks saved directly to [collection].`
- When that empty parent has children, the empty state shows compact links to those child collections.
- The interface removes third-tier creation actions wherever it can. Invalid parent choices remain disabled only when showing the reason helps the user understand the limit.
- Invalid nesting targets in reorder mode show a clear unavailable state before drop.
- Prevented depth violations do not produce a generic error toast.

### Most Visited Tracking

- `bookmark_events(id, user_id, bookmark_id, created_at)` is an append-only insert per visit and the source of truth.
- Index `bookmark_events` on `(user_id, bookmark_id)`.
- The event log supports future windowed queries such as visited-this-week and trending without schema changes.
- `bookmarks.visit_count INTEGER` is the cached counter used for fast sorting.
- A Supabase trigger on `INSERT` into `bookmark_events` maintains `visit_count`; sorting reads that column directly in O(1), with no aggregation at query time.
- The client accumulates clicks in TanStack Store memory for the session.
- TanStack Pacer runs a 30-second flush interval and a `visibilitychange` safety flush.
- Each flush batch-inserts one `bookmark_events` row per visit; the trigger updates the cached counter.
- Clicks accumulated since the last flush may be lost on hard crash. This is acceptable because visit counts are a sorting aid, not transactional data.

### Tag Filtering

- Selecting multiple tags uses OR semantics. Show bookmarks that match any selected tag; there is no AND mode.
- Tags are normalized through `bookmark_tags`.
- OR filtering queries `WHERE tag_id = ANY(ARRAY[...selected])` on a GIN-indexed `tag_id` column.

### X (Twitter)

#### Save tweet

- `x-tweet-saver.ts` injects a save button into X tweet cards.
- The content script uses a `MutationObserver` on `article[data-testid='tweet']` elements.
- Clicking the injected button saves the tweet to the `X Bookmarks` collection, auto-created on first use when it does not already exist.

#### Bookmark import

- V1 ships two locked paths.
- **File upload:** the user downloads their X data archive and uploads `bookmarks.js`. This has zero X Terms-of-Service exposure.
- **Scroll capture:** opt-in, user-initiated only. A content script at `x.com/i/bookmarks` reads tweet URLs from the DOM as the user scrolls naturally.
- Scroll capture shows explicit disclosure and sends URLs only to the backend.

## Account & Onboarding

### Authentication

- Email and password.
- Magic link through OTP-based passwordless login, as an alternative to email and password.
- Google OAuth.

### Profile Setup

- Email/password users are prompted to set a username and choose an avatar during onboarding.
- Onboarding is skippable. Closing it or skipping it lands the user on the dashboard with defaults already in place and never blocks access.
- The default username is extracted from the email prefix, such as `john` from `john@example.com`.
- The default avatar is randomly assigned by a third-party package that generates random avatars.
- Users can complete or update their profile from settings at any time.
- Users may upload JPEG, PNG, or WebP avatars up to 2 MB.
- Custom avatars are stored in the Supabase Storage `avatars` bucket with public read and authenticated write.
- Replacing an avatar deletes the old custom avatar from its table record and Storage bucket.
- Deleting a custom avatar restores a generated avatar. Setting a custom avatar removes the generated-avatar record; deleting that custom avatar generates one again.
- Google users import their Google avatar automatically. Users may override it with an app avatar.
- Google usernames default to the Google first name, falling back to the email prefix when no first name is available.
- Overriding a Google avatar with a custom avatar does not delete the Google avatar. Deleting the custom avatar restores the Google avatar.

### Account Deletion

- Account deletion uses a two-step confirmation. The user must type `delete` before the destructive action becomes available.
- Confirmation permanently deletes all user data through `CASCADE` from `auth.users`, including bookmarks, collections, tags, and profile.
- Confirmation immediately invalidates the auth session.
- On its next Supabase 401, the extension clears `chrome.storage.session` and `chrome.storage.local`.
- The extension then shows: "Log in at reway.page to use the extension."
- This action is permanent, unrecoverable, and has no grace period or soft delete.

## Chrome Extension

### Popup

- Save the current tab with optional collection selection.
- Save all tabs in the current window as a collection.

### New Tab

- Planned, not yet committed. Direction is similar to Toby and Start.me extensions.

### Floating bookmark browser button

- Planned, not yet committed. Direction is similar to Next.js floating Dev Tools and may become a radial menu.

### Platform

- Chrome Manifest V3 only; no earlier manifest versions.

## Product Boundaries

- The library is private by default. Every mutation is user-scoped and Supabase-auth enforced.
- Save latency must be zero. Enrichment is secondary, asynchronous, and non-blocking.
- Enrichment failures show only a small indicator on the bookmark card. They never produce a toast.
- Canvas exists to organize and launch bookmarks, not to replace Miro or FigJam.
- Canvas nodes are bookmark references only, never freeform content.
- React Flow drawing tools are gated behind a paid subscription.
