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

- Bookmark insertion, creation of an enrichment request, and queueing happen in one database transaction. A committed bookmark cannot lose its enrichment request between those steps.
- Supabase Queues is the durable record of pending delivery. Database webhooks may wake a consumer, but they are never the only record that work exists.
- Batched Edge Function consumers perform enrichment independently of the browser session. Work continues if the user closes Settings, changes tabs, reloads, or closes the browser.
- Quick saves and manual re-enrichment use an interactive queue. Imported bookmarks use a bulk queue with reserved worker capacity. Interactive work may pass bulk work, but bulk work must continue to make progress.
- Enrichment fetches and extracts title, favicon, and OG-image metadata as one bounded operation regardless of the current view. A missing OG image is a valid enriched result with a null image.
- On completion, the worker writes title, favicon, OG image, and `metadata_status = 'enriched'`.
- Re-enrichment preserves the last good metadata while it is pending. Success replaces it. Failure keeps it and sets `metadata_status = 'failed'`.
- A new bookmark that fails enrichment keeps its URL-derived title and domain fallback.
- Queue consumers assume a message may arrive more than once. A stable request ID, idempotency key, and request generation prevent duplicate or stale writes.
- Reway retries transient worker, network, DNS, timeout, rate-limit, and selected server failures at most three times with bounded exponential backoff and jitter. It respects `Retry-After` when present.
- Reway does not retry permanent URL, security, content, authorization, or validation failures.
- After the attempt limit, the worker stores a failed result. A user may start a new re-enrichment request from the bookmark overflow menu with a new request generation and attempt budget.
- Before manual re-enrichment, the client resets `metadata_status` to `pending` so the card immediately shows the in-progress state.

#### SSRF protection

- SSRF protection lives inside the Edge Function, in one place for every save path including the extension.
- Before any connection, enforce `https` and `http` only, reject embedded credentials, parse the hostname, resolve and pin the destination, and block local, private, link-local, multicast, reserved, and cloud-metadata addresses for IPv4 and IPv6.
- Disable automatic redirects. Resolve and validate every redirect target before following it.
- Apply DNS, connection, response-header, response-body, redirect-count, content-type, and total-duration limits.

#### Why enrichment is not a TanStack server function

- Client-session coupling is disqualifying: if the tab closes before a second RPC fires, enrichment is silently lost.
- On the developer's current Vercel Hobby plan, tighter function-duration limits compound the issue and enrichment competes with SSR traffic on the same runtime.

### Extension ↔ Dashboard Realtime Sync

- The dashboard subscribes to one private Supabase Broadcast channel named for
  the authenticated library owner. Realtime Authorization permits a user to
  join only `library:<their-user-id>`.
- `useRealtimeBookmarks.ts` manages the subscription and is mounted in
  `_dashboard.library.tsx`.
- When the extension saves a bookmark, the dashboard receives two compact
  notices:

  1. `INSERT`: the bookmark appears immediately with raw URL and title and `metadata_status = 'pending'`.
  2. `UPDATE`: the Edge Function completes enrichment and writes back. The card updates with title, favicon, OG image, and `metadata_status = 'enriched'` or `failed`.

- Each normal notice carries the operation, bookmark ID, and monotonic row
  version. The client fetches any fields it does not already hold.
- Imports, restores, cleanup, and large set-based mutations suppress per-row
  notices and send one `library_resync_required` notice after commit.
- Visit events, bookmark statistics, search rows, queue data, and worker
  diagnostics never broadcast.
- No polling and no manual refresh.
- Realtime is a fast notification path, not the source of truth. After
  subscription, reconnect, tab focus, a bulk resync notice, or a known gap, the
  client queries the current user-scoped rows and rejects stale notices by row
  version.

#### Required setup

- Add Realtime Authorization policies that compare the private channel topic
  with `(select auth.uid())`.
- A private trigger helper with a fixed empty `search_path` emits approved
  notices. Public roles cannot call it.
- RLS still protects every source table. A Broadcast notice never grants access
  to a row or replaces an authenticated refetch.

### Collections

- Collections are user-managed bookmark groups. A bookmark may belong to more than one collection.
- A collection has a required name, one icon, and one palette color. New collections use the Folder icon in Neutral by default.
- Collection colors use the same Neutral, Red, Orange, Amber, Lime, Green, Teal, Cyan, Blue, Indigo, Violet, and Rose palette as tags. Custom colors are not supported.
- New nested collections also start Neutral and do not inherit their parent's color.
- Collection names are trimmed, collapse repeated inner spaces, preserve case and supported punctuation, and allow Unicode including Arabic and accented characters.
- Collection names have a 24-character limit and must be globally unique within the user's library after case-insensitive comparison and surrounding-space removal.
- Collection names reject line breaks and control characters.
- The collection icon picker contains 24 icons in four tabbed groups of six:
  - General: Folder, Bookmark, Archive, Star, Heart, Stack.
  - Work: Briefcase, Person, Buildings, Calendar, Clipboard, X logo.
  - Learning & Creative: Book, Notebook, Research, Paintbrush, Code, Camera.
  - Personal: Home, Cooking, Travel, Location, Shopping, Fitness.
- Icon search covers every group and supports plain-language aliases such as `recipe`, `job`, and `trip`.
- The icon combobox shows named choices under General, Work, Learning & Creative, and Personal. Search filters every group.
- Selecting an icon closes the picker. The Icon field shows the selected icon, color, and name as its trigger.
- The selected collection icon and color appear in the desktop sidebar, collapsed rail, mobile drawer, command search, collection pickers and menus, the editor's Icon field, and reorder feedback.
- System destinations keep their fixed icons.
- `X Bookmarks` starts with the X logo in Neutral when X creates it. Its icon and color remain editable, and it uses normal collection deletion rules. A later X save recreates a missing `X Bookmarks` collection with the X logo in Neutral.
- Session-created collections start with the Folder icon.
- Existing and imported collections without saved color data render as Neutral. Their next edit saves Neutral unless the user selects another palette color.

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
- A tag has one color identity chosen from Neutral, Red, Orange, Amber, Lime, Green, Teal, Cyan, Blue, Indigo, Violet, or Rose. Custom colors are not supported.
- New tags use the least-used palette color. Palette-order priority breaks ties.
- The chosen hue uses a darker value in the light theme and a lighter value in the dark theme.
- Each palette choice uses the colored tag-chevron icon instead of an abstract color dot so the picker previews the result directly.
- The colored tag-chevron icon appears wherever the tag appears, including the desktop sidebar, collapsed rail, mobile drawer, menus, filters, chips, command search, and previews.
- Tag text, row backgrounds, and selected states remain neutral.
- Tag rows do not show bookmark counts.

### Collection and Tag Management

- Expanded collection and tag headers contain a disclosure trigger, a section menu, and a create button.
- The disclosure caret sits directly after the section label. The section menu and create button occupy fixed trailing slots.
- The section menu and create button keep separate horizontal hit areas. Neither button can take clicks from the other button's slot.
- On desktop, the section menu appears when the section header receives hover or focus. It remains in a fixed trailing slot.
- On touch surfaces, the section menu remains visible.
- The collapsed desktop rail hides section headers, disclosure controls, create buttons, and section menus without leaving blank header space.
- Collection and tag disclosure preferences apply only to the expanded sidebar. The collapsed rail treats both sections as open without changing their saved expanded-sidebar state.
- The collapsed rail renders top-level and child collections as one flat icon list. Child tooltips use their full path, such as `Media / Streaming Platforms`.
- The collapsed rail also shows colored tag icons with tooltips. A quiet divider separates collections and tags.
- Mobile always uses the expanded navigation drawer. It keeps children visible and indented, and it keeps row menus available without hover.
- An empty expanded section keeps its header and shows one muted, non-interactive row: `No collections yet` or `No tags yet`.
- Create and edit use Dialog. It stays centered on desktop and attaches to the bottom edge on mobile without adding another swipe-driven drawer. Mobile Display uses the same Dialog treatment over the open navigation drawer.
- Create and edit share one form body with a required name field and separate Icon and Color fields.
- The lazy-loaded Icon field uses one grouped searchable combobox. Its input shows the selected icon, color, and name. Its popup shows each icon beside its name under General, Work, Learning & Creative, or Personal. Typing filters all groups and includes plain-language aliases.
- The collection and tag forms share one compact 12-color Radio Group. Each collection choice shows the current collection icon in that color. Each tag choice keeps the fixed tag-chevron icon. A color change updates the Icon field at once.
- The collection form includes an optional `Parent collection` field. `Top level` is the default.
- Only top-level collections that can accept a child appear as valid parents. The current collection, child collections, and any choice that would exceed the depth limit remain unavailable with a short reason.
- The Collections header create button starts a top-level draft. A top-level collection row offers `New nested collection`, which opens the same form with that collection selected as the parent.
- Editing a child can move it to another valid top-level collection or back to `Top level`.
- Editing a top-level collection that already has children cannot assign it a parent. The editor explains that its children must move first.
- The tag form always shows the 12 icon-based palette choices.
- The editor uses a local draft. Visible stored values change only after Save.
- Name fields stay neutral until a submit attempt. Moving from Name to Icon or Color never shows an error. Create and Save remain available until a request starts. An invalid submit shows the inline error and returns focus to Name. Enter submits from the name field.
- Dialog and AlertDialog content stays mounted until the close animation finishes, so titles and form content do not change during exit.
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
- The navigation footer uses Display, Trash, then Settings on desktop and mobile. Display keeps its sliders icon and adds a trailing Up/Down caret to show that it opens more controls. On a fine pointer, the caret appears on hover, while its menu is open, or when keyboard focus is visible. Touch keeps it visible. Settings opens a modal dialog without changing the active library destination.
- Mobile shows a compact `Show [count] bookmarks` action only while at least one tag filter is active. The action closes the drawer and returns focus to the navigation trigger.

### Collection and Tag Menus

- A collection row keeps its direct bookmark count in the trailing slot while inactive.
- On desktop pointer hover anywhere on the row, or when the row receives keyboard focus, the collection row replaces its count with an ellipsis button. The active collection keeps the ellipsis visible.
- Tag rows use the trailing slot for the ellipsis button and never show counts.
- Touch surfaces keep row ellipsis buttons visible and hide collection counts so the two trailing items never overlap.
- Pointer focus left after a menu or command closes does not keep a row painted or its actions visible. Hover, an open popup, and visible keyboard focus do.
- Collection and tag section carets follow the same hover, open-popup, and visible-keyboard-focus rule. Touch keeps them visible.
- Every overflow menu uses the shared 16-pixel `OverflowMenuIcon`. Sidebar row actions keep their 24-pixel visible button, while bookmark and section actions keep `icon-xs`. Their larger pointer and touch targets remain separate from the visible control.
- Parent and child collection rows share a 32-pixel height. Nesting changes width and indentation, not height. The shared sidebar action centers itself without row-specific offsets.
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
- The active section header becomes `Reordering collections` or `Reordering tags` with a `Done` button that stays visible without hover.
- Reorder mode hides the create control, section menu, collection counts, and row actions, and shows one trailing drag handle per item.
- Rows do not navigate during reorder mode. Other sections remain visible, and selecting another destination exits reorder mode.
- Pointer, touch, and keyboard input can reorder from the handle.
- Collection drag behavior exists only in explicit reorder mode. Normal navigation never starts a drag.
- Collection reorder uses one flat sortable list. Indentation shows parentage, but the dragged row never moves into another DOM list while dnd-kit finishes the operation.
- Vertical movement changes order. A top-level collection stays top-level unless the pointer also moves at least 16 pixels to the right.
- Moving a top-level leaf right past that threshold nests it under the nearest valid top-level collection before it. Moving a child left past the threshold returns it to the top level.
- The source row leaves one fixed gap at the projected destination. The gap shifts to the child indent when the nesting threshold is crossed. The future parent gains a quiet selected state, and a short branch joins its tree guide to the gap. These cues preview the resulting structure without changing list height.
- The first eligible top-level drag shows one out-of-flow hint: `Drag right to nest`. Crossing the nesting threshold hides it for the current drag. The first successful nest stores completion and prevents the hint from returning. The Edit form's parent field remains the visible non-gesture path.
- A parent and its children move as one block. The list removes the descendants from collision detection during the drag, then restores them directly after their parent on drop.
- Child collections never accept nested drops. Moving a child farther right clamps it at the existing child depth without showing an error state.
- A top-level collection that already has children cannot move into another collection because that would create a third tier. The destination gap remains neutral because vertical reorder stays valid. A restrained red outline and prohibited badge appear only after the branch moves one full 32 pixel indent to the right at a position with a valid parent candidate.
- This invalid nesting attempt never opens a confirmation and never flattens the source. A drag operation must not hide a destructive hierarchy change.
- Pointer and touch input start from the drag handle with input-specific activation constraints. The handle owns the pointer start so a parent mobile drawer cannot treat the reorder drag as a dismiss swipe. Keyboard input reorders siblings from the handle; keyboard reparenting uses the Edit form's `Parent collection` field.
- One drag overlay follows the pointer. The source row stays in the flat list as the destination gap, which prevents duplicate rows and keeps drop cleanup stable. Releasing the pointer removes the gap and overlay before the row completes its 140 millisecond settle transition.
- Each drop saves optimistically.
- Done, Escape, collapsing the section, and closing the mobile drawer exit reorder mode without reverting completed drops.

### Collection and Tag Deletion

- Deleting a tag requires confirmation, permanently deletes the tag, and removes it from every bookmark. Bookmarks remain.
- The tag confirmation shows its name and affected bookmark count without a decorative tag icon.
- Tag confirmation copy follows: `This tag will be removed from 14 bookmarks. This cannot be undone.`
- Deleting a collection requires confirmation and permanently removes the collection, its icon, its order, and its memberships.
- Deleting a top-level collection also permanently deletes every child collection beneath it. Children are not promoted to the top level.
- Cascade deletion is intentional because children remain visible under their parent before confirmation. It lets a user remove one complete collection group without deleting every child separately.
- After Reway removes every membership in the deleted collection subtree, bookmarks with no surviving collection membership move to Trash and remain recoverable for 30 days.
- Bookmarks that still belong to a collection outside the deleted subtree remain unchanged in those surviving collections.
- Restoring a bookmark that moved to Trash because all its collection memberships were inside the deleted subtree returns it as Uncollected.
- A leaf collection confirmation shows its name and exclusive bookmark count without a decorative collection icon.
- A parent collection confirmation also shows the number of child collections that will be deleted and the number of bookmarks that will move to Trash after the full subtree is removed.
- Leaf confirmation copy follows: `The collection cannot be restored. 8 bookmarks that exist only in this collection will move to Trash.`
- Parent confirmation copy follows: `Media and its 3 nested collections will be permanently deleted. 18 bookmarks that exist only in these collections will move to Trash.`
- Delete confirmation does not require typed text.
- Pending deletion disables dismissal and the destructive button.
- Deleting an inactive item does not change the current destination.
- Deleting the active collection, or a parent of the active collection, returns the content pane to All Bookmarks.
- Deleting an active tag removes it from the OR tag filter, keeps any remaining tag filters, and returns to All Bookmarks when no tag filter remains.
- Focus returns to the relevant section header after deletion.
- Deletion shows a four-second named toast without Undo. A tag deletion names the tag and the number of bookmarks changed. A collection deletion names the collection; parent deletion also states the number of nested collections deleted and the number of exclusive bookmarks moved to Trash.
- User collections and tags support management. All Bookmarks, Uncollected, Trash, and other system destinations do not. Settings and Display are utility dialogs rather than managed destinations.

### Multi-Select & Bulk Actions

- Users may select multiple bookmarks to delete, move to another collection, add to a collection, or remove from the current collection.

### Trash

- Trash is a working system destination in desktop and mobile navigation.
- Trash shows only bookmarks with `trashedAt`. Trashed bookmarks stay out of All Bookmarks, collections, tags, command search, Uncollected, and saved custom collection order.
- Trashing a bookmark stores `trashedAt` and its exact `purgeAfter` time. Reads
  hide expired rows even if physical cleanup has not run yet.
- The dashboard mock uses one fixed clock for Trash fixtures and mutation dates. Visual components never run an expiry timer.
- Each trashed bookmark shows the time left in its 30-day recovery window and its prior collection context as `From Research`, `From Research + 2`, or `From Uncollected`. Stored collection IDs on a trashed bookmark are restore context, not active memberships.
- Restore clears `trashedAt`, preserves tags and metadata, and returns the bookmark to every prior collection that still exists. A bookmark with no surviving prior collection returns as Uncollected. Restore stays one click and does not open a destination dialog.
- A single restore names its destination: `Restored to Research`, `Restored to 3 collections`, or `Restored to Uncollected`. A bulk restore names a shared destination when one exists. Mixed destinations use one count summary followed by `Returned to their previous collections.` or `Returned to their previous collections or Uncollected.` when a bookmark has no surviving collection.
- Moving bookmarks to Trash shows one four-second toast with Undo. Undo restores the deleted snapshot to its valid prior collections, keeps selection mode closed, replaces the same stable toast with the restore result, and plays one restrained Undo cue after restoration.
- Delete forever permanently removes the bookmark after an Alert Dialog states that the action cannot be undone. Success shows one four-second named toast without Undo.
- Trashed bookmark menus keep Open, Copy link, Select, Restore, and Delete forever. Edit, tag, collection, re-enrich, and normal Delete actions stay hidden.
- Trash selection mode replaces Add, Move, Remove, and Delete with Restore and Delete forever on desktop and mobile.
- Bulk Restore and Delete forever apply one optimistic result to the selected snapshot. Pending work blocks repeat actions. Failure rolls back the full result, keeps the selection, and offers Retry.
- Add, move, remove, Trash, Restore, and Delete forever use one set-based
  database transaction. They never switch to partially committed background
  chunks. If measured database cost requires a selection limit, that limit
  needs a separate product decision.
- Bulk success and failure use one summary and one polite announcement for the action, never one message per bookmark. Failure toasts remain open with Retry.
- Toasts are reserved for results that are easy to miss, occur outside the current view, affect several items, or offer recovery. Direct changes that remain visible use inline feedback instead.
- Global toasts sit at the bottom right on desktop and bottom center on mobile.
- The Trash toolbar stays visually consistent with other destinations. Its labels and action set distinguish the mode without a decorative danger theme.

### Drag and Drop Reorder

- Users enter a reorder mode to manually sort bookmarks within a collection.
- Custom order in a collection is independent of global All Bookmarks order.
- Per-collection sorts are date added, most visited, alphabetical, and custom order.
- Custom order uses fractional indexing through the `fractional-indexing` npm
  package. Keys use bytewise `C` collation and remain unique within their
  ordering scope. Only the moved item's `sort_order` updates: O(1) per reorder.
- Bulk additions use `generateNKeysBetween` to generate all keys in one call.
- Each ordering scope stores an `order_version`. Reorder requests include the
  version they read. The database locks that scope, validates its neighbors,
  updates the moved item, and increments the version. A stale request refetches
  instead of overwriting newer order.
- If a proposed `sort_order` string exceeds 50 characters, the client requests
  a complete scope rebalance. Reorder and rebalance use the same version check
  and lock. The database keeps a larger key-length limit as a corruption guard.
- All Bookmarks and Uncollected use system sorts only: date added, most visited, and alphabetical. Neither supports custom reorder.
- Uncollected uses a partial-index filter, `WHERE collection_count = 0`, which is O(K) for K uncollected bookmarks rather than a `NOT EXISTS` scan over the complete library.
- A statement-level trigger on `bookmark_collections` `INSERT` and `DELETE`
  groups membership changes and updates each affected bookmark's protected
  `collection_count` once per statement.

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
- The command accepts complete `http://` and `https://` URLs and clear scheme-less public web addresses. It trims outer whitespace and prefixes a scheme-less address with `https://`.
- URL recognition does not make a network request. Malformed input, unsupported schemes, localhost, and private-network targets remain search text and do not save by surprise.
- A valid address takes the quick-save path on Enter even when the library already contains the same URL. Duplicate URLs remain allowed.
- Quick add has no collection picker. The user can organize later.
- Quick add creates an Uncollected bookmark and keeps the current destination. When the current view cannot show the new bookmark, announce `Saved to Uncollected. Metadata pending.`
- Keyboard save closes the command at once without decorative motion or a success toast.
- Database search uses a one-row-per-bookmark projection with a language-neutral
  `tsvector` over weighted title, tag, and URL text. It uses a full-text GIN
  index and a trigram GIN index for typo tolerance.
- The command palette queries Supabase directly and never loads the full library into memory.
- Client-side filtering applies only to an already-loaded current view, such as a visible collection; it never substitutes for full-library search.
- Add `pg_trgm` for fuzzy, typo-tolerant matching.

### Browser import, export, and restore

- General browser import accepts Netscape-style bookmark HTML exported by current browsers.
- Browser import merges into the current library. It preserves valid source titles and creation times where the file provides them.
- The first capacity target is 100,000 bookmarks per account. A 10,000-bookmark file is the routine large-import benchmark. The initial configurable file limit is 50 MB.
- Use resumable upload above 6 MB or when a prior upload was interrupted. Uploads use private, user-scoped temporary object paths.
- Parse every import as untrusted data. Never execute scripts or JavaScript wrappers from an uploaded file.
- Review reports bookmarks, folders, invalid rows, duplicates, flattened paths, and collection-name conflicts before commit.
- Valid bookmarks start selected. Duplicate URLs remain eligible.
- Import does not merge a conflicting source folder into an existing Reway collection without approval. It proposes a unique imported name and lets the user choose an existing collection explicitly. `Use suggested names for all` resolves a large set of safe rename proposals at once.
- Unresolved collection-name conflicts block commit. Excluded folders and bookmarks remain excluded instead of moving to Uncollected.
- Import keeps the first two collection tiers. It assigns deeper descendants to the nearest retained child and reports every flattened source path.
- An import is complete when every selected bookmark and collection record has a durable result. Metadata enrichment continues through the bulk queue and does not change import success into partial failure.
- Import Retry processes only records that failed to commit. Re-enrich handles later metadata failures.
- Closing Settings, changing tabs, reloading, losing the client connection, or closing the browser does not stop a durable import job.
- Import progress comes from stored job and item state. The client refetches that state after reconnect instead of relying only on missed Realtime events.
- Import source files use private, user-prefixed Storage paths. Parsing writes
  typed private staging rows through bulk inserts or `COPY`.
- Import commits collections before dependent bookmarks and memberships in
  idempotent batches. The first benchmark batch size is 500 items and may
  change after measurement.
- Import suppresses per-bookmark Broadcast notices and sends one library resync
  notice when the durable import result is ready.
- Reway exports browser-compatible bookmark HTML for portability. It escapes every user-controlled HTML field and omits unsafe URL schemes.
- Browser HTML cannot represent Reway's full data model. Multi-collection bookmarks may appear more than once. Tags, Trash state, visit counts, and Reway-only ordering are not guaranteed to survive.
- Reway also exports a versioned JSON backup for a lossless library restore. It includes user-owned bookmarks, collections, tags, memberships, ordering, and preferences, but excludes secrets, sessions, worker diagnostics, and queue records.
- Reway JSON restore is separate from browser import. It validates and stages the full replacement before asking for confirmation.
- Restore creates a recoverable snapshot of the active library, then activates
  the validated staged snapshot through set-based SQL in one user-scoped
  transaction. Failure before activation leaves the active library unchanged.
- Restore activation suppresses per-row Broadcast notices and sends one library
  resync notice after commit.
- The set-based activation design must pass the 100,000-bookmark lock and write
  benchmark. If it fails, an internal generation model needs separate review.
- Import, export, restore, and recovery files live in private Storage. Database
  rows store their owner, object path, format version, checksum, size, state,
  and expiry. Generated downloads use short-lived signed URLs.
- Export and restore use durable server jobs. Generated exports expire after 24
  hours. Import files and staging rows expire seven days after terminal state.
  Pre-restore snapshots expire after seven days, with at most two per user.

### Collection Hierarchy Feedback

- A parent with no direct bookmarks uses: `No bookmarks saved directly to [collection].`
- When that empty parent has children, the empty state shows compact links to those child collections.
- The interface removes third-tier creation actions wherever it can. Invalid parent choices remain disabled only when showing the reason helps the user understand the limit.
- Moving a parent that carries children toward another parent adds a prohibited badge and restrained red outline to the drag overlay. Rightward over-drag on a leaf or existing child clamps silently at the nearest valid depth.
- Prevented depth violations do not produce a generic error toast.

### Most Visited Tracking

- `bookmark_events(id, event_id, user_id, bookmark_id, created_at)` keeps one
  append-only row per visit for 30 days. It is recent history, not the permanent
  lifetime source of truth.
- Each client-generated `event_id` is unique for retry safety. A repeated event
  insert uses `ON CONFLICT DO NOTHING` and never increments the count twice.
- Index recent event queries and expiry cleanup by their user, bookmark, time,
  and stable ID access paths.
- One narrow `bookmark_stats` row stores each bookmark's permanent
  `visit_count`. Its Most Visited index is
  `(user_id, visit_count DESC, bookmark_id)`.
- A statement-level insert trigger uses its transition table to group new
  events by bookmark and update each statistics row once per insert statement.
- The client accumulates clicks in TanStack Store memory for the session.
- TanStack Pacer runs a 30-second flush interval and a `visibilitychange` safety flush.
- Each flush batch-inserts one `bookmark_events` row per visit; the statement
  trigger updates the permanent counter.
- Clicks accumulated since the last flush may be lost on hard crash. This is acceptable because visit counts are a sorting aid, not transactional data.

### Tag Filtering

- Selecting multiple tags uses OR semantics. Show bookmarks that match any selected tag; there is no AND mode.
- Tags are normalized through `bookmark_tags`.
- OR filtering queries `WHERE tag_id = ANY(ARRAY[...selected])` through a
  composite B-tree index on `(user_id, tag_id, bookmark_id)`. Scalar `tag_id`
  does not use a GIN index.

### X (Twitter)

#### Save tweet

- `x-tweet-saver.ts` injects a save button into X tweet cards.
- The content script uses a `MutationObserver` on `article[data-testid='tweet']` elements.
- Clicking the injected button saves the tweet to the `X Bookmarks` collection, auto-created on first use when it does not already exist.

#### Bookmark import

- V1 ships two locked paths.
- **File upload:** the user downloads their X data archive and uploads `bookmark.js` or `bookmarks.js`. This has zero X Terms-of-Service exposure.
- **Scroll capture:** opt-in, user-initiated only. A content script at `x.com/i/bookmarks` reads tweet URLs from the DOM as the user scrolls naturally.
- Scroll capture shows explicit disclosure and sends URLs only to the backend.
- The dashboard exposes one Import page in Settings. `Import from X` in the Collections section menu opens the same page.
- The file flow uses Choose, Review, Importing, Complete, and Error states.
- Review selects every valid post by default and supports individual selection, Select all, and Clear selection. Importing locks the selection.
- Review may show author, handle, excerpt, and URL after lookup. If lookup fails, the row falls back to its URL and post ID. A missing preview does not block importing a valid URL.
- Duplicate URLs remain eligible because Reway allows duplicates. Review labels posts already in the library and posts repeated in the selected archive.
- A malformed archive stops before Review. An empty archive shows an empty result. If an archive mixes valid and malformed records, Review excludes the malformed records and reports how many it skipped.
- Import is not optimistic. It reports the current step and processed count, then adds each post to the library only after that post succeeds.
- The production X importer uses the same durable import-job records, reconnect behavior, idempotent item commits, and separate bulk-enrichment queue as browser import.
- Successful posts go to `X Bookmarks`. Reway creates the collection with the X icon and Neutral color when needed, or reuses the existing collection.
- Settings may close while an import runs. Reopening Import restores its current state, and Reway blocks a second import until the first one finishes.
- Partial failure keeps successful posts and retries only failed posts. Total failure adds nothing. Retry keeps the chosen archive, selection, and review results.
- Complete links to `X Bookmarks` and lets the user choose another file.
- The dashboard mock keeps archive contents, initial result, retry result, and speed as temporary Demo fixtures. It does not parse or upload the selected file.
- Folder flattening and imported collection-name conflicts belong to future imports that contain folders. They do not appear in the X archive flow.

## Account & Onboarding

### Authentication

- Email and password.
- Email and password sign-up requires email confirmation before first sign-in.
- Magic link through OTP-based passwordless login, as an alternative to email and password.
- Production sign-in includes Google OAuth.
- Supabase may link Google to an existing Reway user only when Google returns the same verified email.
- V1 keeps manual identity linking disabled. Different email addresses stay separate, and Reway does not merge accounts or libraries.
- Usernames are non-unique display names. The authenticated user ID owns data and authorization; usernames do not identify accounts or appear in public routes.
- If Reway later adds public identity, it will add a separate normalized, unique handle instead of changing username meaning.
- Password recovery starts on a public request page and always returns the same response whether the email belongs to an account or not.
- The recovery email returns to an allowlisted in-app route with a valid recovery session. That route collects and confirms the new password, applies the change, and shows a clear result.

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

### Settings and Profile UI

- Settings opens as a large modal dialog over the current library. Closing it preserves the active library destination and returns focus to the Settings button. On mobile, it opens above the navigation drawer and returns to that drawer when it closes.
- Desktop Settings uses a persistent left navigation for Profile, Account, and Demo. These are page buttons, not tabs: normal Tab order moves through them, the current button uses `aria-current="page"`, and activation replaces the content page. Mobile opens to a Settings page list in the full-screen dialog, then drills into one page at a time with a clear Back action. Neither layout uses tab-list, tab, or tab-panel semantics.
- Demo is visually separate from the account settings. The whole section is mock-only and must be removed when real authentication and profile data replace its fixture adapter.
- A username trims outer whitespace, must contain 1 to 40 characters, may use Unicode, and does not simulate uniqueness in the mock.
- Username and avatar changes share one `Save changes` action. A valid avatar selection shows a square cover preview at once but remains part of the draft until save.
- The avatar picker accepts JPEG, PNG, and WebP files no larger than 2 MB. It reports type or size errors before creating a local preview. The mock does not include an image crop editor.
- Profile changes remain available while the user moves between Settings pages. A failed save preserves every field, the chosen avatar source, and any valid local preview so Retry uses the same draft.
- While a fixture save is pending, the form shows an indeterminate local status and blocks repeat submission. It does not show a percentage.
- Outside press cannot close Settings while the profile draft is dirty. The close button and Escape ask the user to save or discard the draft. Saving or discarding closes without another prompt.
- Email profile fixtures begin with an email-derived username and generated avatar. Removing an uploaded avatar restores a generated avatar. Google profile fixtures begin with the Google first name or email-prefix fallback and keep the Google avatar available beneath a custom upload.
- The onboarding editor reuses the profile fields and remains skippable. Closing an untouched editor uses the defaults. Closing or skipping after a draft change asks whether to use the defaults instead. Outside press never discards a changed onboarding draft.
- Demo controls provide Email defaults, Google defaults, the next profile-save result, the next account-deletion result, `Preview profile setup`, and `Reset demo`. Changing the profile fixture or resetting the demo asks for confirmation when a profile draft is dirty.

### Account Deletion

- Account deletion uses a two-step confirmation. The user must type `delete` before the destructive action becomes available.
- After typing `delete`, the user must complete fresh authentication with the current sign-in method before the server may delete the account. A normal existing session is not enough.
- Failed or cancelled authentication leaves the account and its data unchanged.
- After final confirmation, the server marks deletion pending, blocks new
  writes, and revokes active sessions.
- The deletion job removes every tracked private Storage object through the
  Storage API in batches of at most 1,000. It then deletes the Auth user and
  lets foreign-key cascades remove relational data, including bookmarks,
  collections, tags, and profile.
- The confirmed deletion flow is idempotent and retries until it finishes.
  Once deletion starts, the interface shows pending status instead of promising
  rollback across Storage and Auth.
- On its next Supabase 401, the extension clears `chrome.storage.session` and `chrome.storage.local`.
- The extension then shows: "Log in at reway.page to use the extension."
- This action is permanent, unrecoverable, and has no grace period or soft delete.
- The Account page starts deletion with a warning that names the library data at risk. Continuing opens a second confirmation that requires the exact text `delete` before enabling the destructive action.
- Pending deletion blocks repeat submission and dialog dismissal. A fixture error remains visible in the confirmation until the user retries or corrects it.
- A successful mock deletion closes the confirmation and shows a persistent result in Settings. It states that the mock did not delete an account or end a session. `Reset demo` acknowledges the result and restores the profile fixture.

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
- Reway retries transient enrichment failures at most three times. It does not retry permanent failures or continue after the attempt limit without a user-started Re-enrich action.
- Canvas exists to organize and launch bookmarks, not to replace Miro or FigJam.
- Canvas nodes are bookmark references only, never freeform content.
- React Flow drawing tools are gated behind a paid subscription.
