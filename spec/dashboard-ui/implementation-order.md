# Dashboard UI implementation order

## Purpose

This file sets the dashboard build order at `/dashboard-ui`. Phases 0 through 7
produced the UI-only mock. Phase 8 begins the bottom-up backend work. This file
turns the approved behavior in
`spec/integrations/features/feature-contract.md` into small implementation phases.

The feature contract remains the source of truth for product behavior. This file
may choose when to build a feature, but it does not change what that feature does.
Record any product change in the feature contract first.

## Lock status

This UI order and the interaction decisions inside it were locked on 2026-08-31.
Implementation may improve code shape, but it must not change the named user
behavior without an explicit product decision and a matching spec update.

The Phase 8 direction changed by explicit product decision on 2026-09-05. The
backend will now replace mock adapters in gated slices instead of waiting for a
separate final mock pass. The full technical order lives in
`spec/integrations/supabase/phase-08/roadmap.md`.

## Scope

Phases 0 through 7 built the dashboard as a local mock. Phase 8 adds the backend
from the database upward while preserving the approved UI behavior.

Included:

- Dashboard navigation and bookmark views.
- Collection, tag, bookmark, selection, filtering, Trash, and settings flows.
- Desktop, touch, keyboard, loading, empty, success, and error states.
- Deterministic local fixtures for operations that will later use a backend.

Excluded until its Phase 8 slice starts:

- Supabase setup, authentication, schema, migrations, RLS, Realtime, Storage,
  and Edge Functions outside the order in the Phase 8 backend plan.
- The Chrome extension implementation.
- Production persistence or deployment.
- Planned but uncommitted New Tab and floating browser-button work.
- Canvas until it has a dedicated feature contract.

## Current baseline

As of 2026-09-05, the mock has a strong UI base:

- Responsive desktop and mobile navigation.
- List, compact grid, and image-grid bookmark views.
- Bookmark overflow menus, context menus, edit, tag, collection, re-enrich,
  selection, and delete controls.
- Collection and tag create, edit, delete, ordering, and reorder flows.
- Two-tier collection hierarchy and bookmark reorder mode.
- Command search for mock bookmarks and collections.
- Display and sort controls.
- One destination model for All Bookmarks, collections, tags, Uncollected, and
  Trash.
- Menu-entry bookmark selection, range selection, destination-scoped Select all,
  and optimistic bulk actions.
- A desktop selection bar and one thumb-reachable mobile Actions button with an
  action sheet.
- OR-based tag filtering with active sidebar rows, removable filter controls,
  Clear, mobile result confirmation, and selection reset.
- A working Uncollected destination with desktop and mobile navigation, system
  sorts, selection rules, and membership-driven updates.
- A working Trash recovery view with fixed recovery windows, Restore, Delete
  forever, item actions, Trash-specific bulk actions, rollback, and Retry.
- Complete local management feedback with named success, pending, failure,
  Retry, rollback, and Undo states.
- Responsive Settings with page navigation, profile and avatar editing,
  onboarding, Demo fixtures, and account deletion.

The following parts are incomplete:

- Command search says a pasted URL can be saved, but the mock does not add it.

Browser, keyboard, screen-reader, responsive, and rendered contrast checks remain
unverified until the user gives explicit browser permission.

## Progress

- Phase 0 is complete and passed its full static, test, build, diff, and React
  Doctor checks.
- Phase 1 is complete. Twelve focused selection tests, `pnpm run check`, the
  production build, `git diff --check`, and React Doctor at 100/100 passed.
- The user waived the full Vitest gate for Phase 1.
- Phase 2 is complete. Twelve focused destination and tag-filter tests,
  `pnpm run check`, the full 114-test suite, the production build,
  `git diff --check`, and full-project React Doctor at 100/100 passed.
- Browser checks remain unverified after Phase 2.
- Phase 3 is complete. Five focused Uncollected destination and flow tests,
  `pnpm run check`, the full 119-test suite, the production build,
  `git diff --check`, and full-project React Doctor at 100/100 passed.
- The full suite needed four workers to avoid CPU-contention timeouts in two
  existing dashboard tests. Both tests also passed in focused runs.
- Browser checks remain unverified after Phase 3.
- Phase 4 is complete. Fourteen focused Trash model, action, selection, and flow
  tests, `pnpm run check`, the full 133-test suite, the production build,
  `git diff --check`, and full-project React Doctor at 100/100 across 95 files
  passed.
- The full suite used four workers. Browser, touch, keyboard, screen-reader,
  responsive, and rendered contrast checks remain unverified after Phase 4.
- The Phase 4 deletion and recovery feedback, responsive toast position, and
  navigation refinements passed the latest 43-test focused run, the full
  148-test suite, `pnpm run check`, the production build, `git diff --check`,
  and changed-scope React Doctor at 100/100 across 26 files.
- Phase 5 is complete. The final focused management run passed 32 tests across
  four suites. `pnpm run check`, the production build, `git diff --check`, and
  changed-scope React Doctor at 91/100 with no findings passed.
- Phase 6 is complete. The final focused account, Settings, navigation,
  management, controls, and Trash run passed 45 tests across six suites.
  `pnpm run check`, the production build, `git diff --check`, and changed-scope
  React Doctor at 91/100 with no findings across 14 files passed.
- Browser, touch, keyboard, screen-reader, and rendered checks remain unverified
  after Phase 6.

## What counts as a complete mock

A phase is complete only when:

- Its main action has no dead end.
- The same state drives list, grid, image-grid, sidebar, dialog, and mobile views.
- Desktop pointer, touch, and keyboard paths reach the same result.
- Empty, mixed, disabled, destructive, and failure states have defined behavior.
- Every interaction defines its trigger, rules, feedback, mode or loop behavior,
  and exit state.
- Mock delays and outcomes are deterministic. Do not use random failures or
  timers inside visual components.
- Tests cover behavior through the module interface and visible controls.
- `pnpm run check`, the relevant Vitest tests, `pnpm run build`, and
  `git diff --check` pass.
- Browser verification is reported separately when permission is not available.

## Build rules

1. Finish one phase before starting the next.
2. Use the existing local UI controls before adding a new one.
3. Put shared rules in one module and keep its interface small. Do not rebuild
   destination, selection, or mutation rules inside each view.
4. Keep local fixtures separate from visual components so later data work can
   replace the mock without rewriting the interface.
5. Do not add backend-shaped abstraction layers before two implementations need
   the same seam.
6. Preserve the direct-bookmark rule for collection views. Parent collections do
   not include bookmarks from their children.
7. Do not change `src/routeTree.gen.ts` by hand.

## Interaction quality lock

These rules apply to every phase.

### Triggers and targets

- Every primary or frequent action has a visible trigger. A gesture, context
  menu, or keyboard shortcut may speed up an action but cannot be its only path.
- Labels use the result verb, such as Select, Move, Restore, or Delete forever.
- Touch targets are at least 44 by 44 pixels. Dense desktop targets are at least
  40 by 40 pixels. Extended hit areas never overlap adjacent controls.
- Hover-only controls appear only for fine pointers and remain reachable by
  keyboard focus.
- Hover may reveal a trigger but must never enter a mode or commit an action.
- Disabled actions expose a short reason through visible text or accessible
  description. Do not leave the user to infer why nothing happened.

### Immediate feedback

- Direct manipulation shows a visible state change within 100 milliseconds.
- If an operation lasts longer than 300 milliseconds, the initiating control
  shows a local pending state. Do not flash a spinner for shorter work.
- One action produces one result message. Bulk work produces one summary, never
  one toast or announcement per bookmark.
- Routine hover, focus, checkbox, and selection changes use visual feedback only.
  Do not add a toast, sound, or haptic response to each one.
- Visual feedback is primary. Screen-reader announcements cover meaningful mode,
  pending, success, and error changes without announcing every pointer movement.
- Mock progress must be honest. Use an indeterminate state when duration or
  percentage is unknown, and a determinate value only when the fixture defines
  real steps.

### Modes and interruption

- Selection and reorder remain the only dashboard management modes. They cannot
  run at the same time.
- A mode has a persistent label, a visible exit action, Escape support, and a
  clear change in available controls.
- Mode entry requires a click, tap, or keyboard action. Hover and focus alone do
  not enter a mode.
- The latest user intent wins. Rapid open, close, toggle, and retry input cancels
  or retargets in-flight UI work instead of queuing it.
- Only one mock mutation may be pending for the active workflow. Repeated submit
  or destructive input while pending is ignored and cannot create duplicates.

### Motion

- Decide whether motion helps before choosing a duration. Frequent controls,
  keyboard actions, selection toggles, command search, and list navigation do not
  animate movement.
- Keep selection and reorder feedback crisp. Do not scale whole bookmark rows or
  cards when they are pressed or selected.
- Occasional dialogs, drawers, popovers, and toasts use only the motion already
  owned by their shared UI control. Anchored popovers use the trigger origin;
  centered dialogs keep a centered origin.
- Overlay sequences stage backdrop, panel, then focus. Focus never waits for a
  decorative animation to finish.
- Interactive state changes use interruptible transitions, not keyframes.
- Animate only named properties. Never use `transition-all` or animate layout
  through width, height, margin, or padding when fixed geometry can avoid it.
- Use `will-change` only after measured first-frame stutter. Never apply it as a
  standing rule.
- Reduced motion removes movement while keeping instant state, opacity, color,
  focus, and status feedback.
- Keyboard-triggered paths skip decorative motion.

### Surface and text details

- Nested toolbar, card, menu, and dialog surfaces keep concentric radii when their
  padding is 24 pixels or less.
- Use the existing semantic surface, border, shadow, and focus tokens. Do not add
  a one-off depth treatment for a new phase.
- Dynamically changing counts and time values use tabular numerals.
- Short headings use balanced wrapping. Short descriptions and empty-state copy
  use pretty wrapping. Long content keeps normal wrapping.
- Image previews retain the shared inset neutral outline in light and dark themes.

### Accessibility and focus

- Do not nest buttons, links, checkboxes, or other interactive controls.
- Every visual state has a text, icon, shape, or semantic-state equivalent. Color
  alone never carries selection, error, or destructive meaning.
- Pending status uses `role="status"` or a polite live region. Errors use an
  assertive announcement only when immediate attention is required.
- Focus moves to the new workflow only after an explicit trigger and returns to
  that trigger when the workflow closes.
- Error recovery preserves the draft, selection, destination, and the action the
  user was trying to complete whenever those values remain valid.

## Phase 0: dashboard destination model [complete]

Build this internal UI state before selection or filtering.

Replace `activeCollection: string | null` with one destination type that can
represent:

```ts
type DashboardDestination =
  | { kind: "all" }
  | { kind: "collection"; collectionId: string }
  | { kind: "tags"; tagIds: string[] }
  | { kind: "uncollected" }
  | { kind: "trash" }
```

One destination module should derive:

- The visible bookmark result set.
- The page heading and empty-state context.
- Valid sort and reorder choices.
- Whether removal from the current collection is available.
- Which sidebar rows and tag filters are active.
- Whether navigation must clear selection or exit reorder mode.

Keep the module in-process and deterministic. Its interface is the test surface.
Do not make each sidebar or bookmark view interpret destination rules itself.

Acceptance:

- All five destination kinds have focused tests.
- Collection results include direct memberships only.
- Tag results use OR behavior.
- Uncollected excludes Trash.
- Trash excludes every normal library view.
- The current list, grid, and image-grid views consume the same result set.

Complexity:

- Deriving a destination result should be O(B) for B bookmarks before sorting.
- Membership checks should use sets when several tag IDs are active.
- Do not add nested scans over every bookmark and every collection when a lookup
  map can keep the work linear.

## Phase 1: real bookmark selection and bulk actions [complete]

The per-bookmark menu Select action enters selection mode and selects that
bookmark. Normal browsing shows no checkbox or persistent Select control.

### Selection state

One selection module owns:

- Whether selection mode is active.
- Selected bookmark IDs in a `Set`.
- The current destination key.
- The most recent direct-selection anchor for range selection.
- The current mutation state: idle, pending, or failed.

The mode follows this state sequence:

1. Normal browsing is idle and exposes Select through each bookmark menu.
2. The menu action selects that bookmark and enters selection mode.
3. Bookmark input changes the selected set immediately.
4. A bulk action enters pending with one stable snapshot of the selected IDs.
5. Success clears the selection, exits the mode, and returns focus.
6. Failure restores any optimistic change, preserves the selection and range
   anchor, announces one error, and returns focus to the failed action.

Selection belongs to the current destination:

- Select all selects the full current result set, not the whole library.
- List or grid changes and sort changes preserve selected IDs.
- A sort change resets the range anchor because visual order changed.
- Destination and tag-filter changes clear selection and exit selection mode.
- A completed bulk action clears selection and exits selection mode.
- The count includes only selected bookmarks still present in the current result.

### Entering selection mode

- Desktop and mobile enter selection through the bookmark's existing action menu.
- The Select menu item selects that bookmark and enters the mode.
- Normal mode renders no checkbox on hover or focus and no panel-level Select
  action.
- Selection never depends on long press, swipe, or a hidden gesture.
- Visible selection-mode checkboxes have at least a 40 by 40 pixel desktop hit
  area and a 44 by 44 pixel touch hit area.

### Bookmark behavior by mode

Normal mode:

- The full bookmark surface is one link and clicking its visible background opens
  the bookmark.
- Enter opens the focused bookmark.
- No selection checkbox appears in normal mode.
- Overflow and right-click menus keep their normal actions.

Selection mode:

- Render one checkbox input and one label that owns the full bookmark target.
  Clicking or tapping anywhere on the label toggles its checkbox. Do not nest a
  checkbox or button inside another button or link.
- The checkbox label uses the bookmark title in its accessible name and exposes
  its checked state semantically.
- Space toggles the focused checkbox.
- Shift-click and Shift+Space select the continuous range from the last direct
  selection anchor through the new target in current visible order.
- The bookmark body never opens a link.
- Overflow actions hide so they do not compete with selection.
- Bookmark reorder is unavailable.
- Double-click, drag-to-select, marquee selection, and swipe selection add no
  separate behavior.

### Visual treatment

- In list, compact grid, and image-grid views, the checkbox replaces the favicon
  in the same slot. Entering selection mode must not shift bookmark content.
- During selection mode, every bookmark keeps its checkbox visible.
- Remove the current trailing selected icon.
- The checked control and shared selected background provide the selected state.
- The full bookmark remains the large toggle target in selection mode.
- Keep the favicon and checkbox slot at one fixed size. Do not animate row, card,
  toolbar, text, or grid geometry when the mode changes.
- Entering selection mode swaps the favicon for the checkbox without animating
  bookmark geometry.
- Individual toggles update within 100 milliseconds with no scale, bounce, blur,
  stagger, or spring.
- Do not add selection sounds or haptics. The checkbox, selected background, and
  semantic checked state provide enough feedback.

### Bulk controls

Desktop replaces the normal panel controls with one sticky selection bar:

- Close selection mode.
- Selected count using tabular numerals.
- Select all or clear all.
- Add to collection.
- Move to collection.
- Remove from the current collection when the destination is a collection.
- Delete.

Keep the bar at the same height as the normal panel controls. Order safe actions
from left to right, place a divider before Delete, and keep action positions
stable for the lifetime of the current destination.

Mobile keeps Close and the selected count in the panel header. One 48 pixel
Actions button sits above the safe area and opens a bottom action sheet.

The sheet exposes Select all or Clear all, Add, Move, context-aware Remove, and
Delete with 44 pixel minimum rows. Add and Move open nested collection sheets.
Delete stays in the final separated group. The bookmark list reserves bottom
space so the Actions button does not cover its final item.

When no bookmarks are selected, keep the mode visible but disable bulk actions
and show `0 selected`. Select all remains available. When every visible bookmark
is selected, its label becomes Clear all. When selection mode exits, return focus
to the bookmark menu trigger that entered the mode, or the main panel if that
bookmark is no longer visible.

Announce mode entry and bulk results through one polite status region. Do not
announce the global count after every toggle because the focused checkbox already
announces its own state.

### Bulk action rules

- Add preserves existing memberships and adds the destination only where it is
  missing.
- Move replaces all collection memberships with the chosen destination.
- Remove deletes only the active collection membership. A bookmark with no
  remaining memberships becomes Uncollected.
- Delete moves bookmarks to Trash. It does not permanently remove them.
- A mixed Add selection changes only bookmarks missing the destination.
- Disable a destination only when the action would change none of the selected
  bookmarks. State the reason in that destination row.
- Delete is the only bulk action that opens a confirmation.
- Add, Move, and Remove apply their optimistic local change at once, then enter
  the fixture-controlled pending state.
- While pending, preserve the selected-ID snapshot, disable every bulk trigger,
  keep the action label visible, and add one local progress indicator to the
  initiating control.
- Success produces one named toast summary with the affected count, announces it
  politely, clears selection, and exits the mode. Delete success includes a
  four-second Undo action; Undo restores the bookmark snapshot without reopening
  selection mode and replaces the same toast with the restore result.
- Failure rolls back the full change, keeps selection mode open, preserves the
  selected IDs, and shows one error with Retry. Retry reuses the same action and
  destination without requiring the user to select everything again.
- Delete confirmation shows the selected count. Pending deletion disables the
  destructive action and dismissal. Success moves the complete snapshot to
  Trash; failure keeps the dialog and selection available for retry.
- Rapid repeated activation never queues or duplicates a bulk action.

### First-use and long-loop behavior

- On the first desktop selection-mode entry with at least two visible bookmarks,
  show one quiet `Shift-click to select a range` hint in the selection bar.
- Dismiss the hint after the first successful range selection or an explicit
  close. Store that completion with the other local mock preferences.
- The hint never appears on mobile and never blocks selection.
- The hundredth use has no coaching, decorative motion, or added confirmation.

### Verification

Test:

- Entry from the item menu and keyboard use of that menu.
- Single toggle, range selection, select all, and clear all.
- Selection across list, compact grid, and image-grid views.
- Sort and view changes, destination changes, and deleted selected items.
- Mixed-membership Add, Move, Remove, and Trash outcomes.
- Desktop and mobile action availability.
- Semantic link and checkbox structure without nested controls.
- Mode entry and exit announcements without count-announcement spam.
- Pending, success, rollback, retry, double-submit prevention, and preserved
  selection on failure.
- Focus return, reduced motion, keyboard motion removal, and rapid repeated
  toggles.
- First-use range coaching and its permanent local dismissal.

Complexity:

- Membership toggle and lookup should be O(1) with a `Set`.
- Range selection should be O(R) for the selected range.
- Select all should be O(V) for V visible results.
- A mock bulk mutation may map the B local bookmarks once, for O(B + S), where S
  is the number of selected IDs. Do not run one full bookmark scan per selected
  item.

## Phase 2: tag filtering [complete]

Make sidebar tags operate as filters rather than inert rows.

- The first tag enters the tags destination.
- Additional tags toggle into the active set.
- Results match any active tag. There is no AND mode.
- Active tag rows use the shared selected treatment and retain their colored tag
  icon.
- The main panel shows a compact active-filter summary with removable tags and a
  Clear action.
- Active-filter controls stay 28 pixels tall. The shared Badge extends each touch
  target to 44 by 44 pixels without making the visible control that tall, and
  wrapped targets do not overlap.
- Removing the final tag returns to All Bookmarks.
- Deleting an active tag removes it from the filter and follows the same fallback.
- Selection clears when the active tag set changes.
- Desktop tag rows update results immediately without closing navigation.
- Mobile tag rows act as checkbox filters and keep the navigation drawer open.
  A compact `Show [count] bookmarks` action appears above the drawer footer only
  while a tag is active. It closes the drawer and returns focus to the navigation
  trigger.
- Tag rows are toggle buttons with `aria-pressed` and expose selected state
  without relying on color. Their row action menus remain separate controls with
  non-overlapping hit areas.
- Tag toggles and result counts update within 100 milliseconds with no per-row
  toast, sound, haptic, or movement animation.
- The mobile result count uses tabular numerals and one polite announcement after
  a toggle. Rapid toggles replace the pending announcement instead of queuing it.

## Phase 3: Uncollected [complete]

Add Uncollected as a working system destination.

- Place it with the other library destinations, not inside Collections.
- Show bookmarks with no collection membership and no `trashedAt` value.
- Keep system sorts only. Do not offer custom order or bookmark reorder.
- Hide Remove from collection in selection mode.
- Add a clear empty state and ensure collection removal can send bookmarks here.
- Keep collection counts and tag filters consistent after membership changes.

## Phase 4: Trash [complete]

Turn the existing Trash row into a complete recovery view.

- Show only bookmarks with `trashedAt`.
- Keep trashed bookmarks out of All Bookmarks, collections, tags, search results,
  and Uncollected.
- Show recovery context based on the 30-day rule with fixed fixture dates.
- Trash rows show prior collection context as `From Research`, `From Research +
  2`, or `From Uncollected`.
- Restore returns a bookmark to every prior collection that still exists. If no
  prior collection survives, Restore returns it as Uncollected.
- Delete forever uses a serious confirmation and cannot be undone.
- Selection mode in Trash exposes Restore and Delete forever instead of normal
  library bulk actions.
- Add empty, mixed-selection, pending, and failure states.
- Show one restore or permanent-delete summary for a bulk result. Name a shared
  restore destination when one exists; use `Returned to their previous
  collections.` for mixed results, or `Returned to their previous collections or
  Uncollected.` when any bookmark has no surviving collection. Do not announce or
  toast each bookmark separately.
- Keep the Trash selection toolbar visibly distinct through its labels and action
  set, not a new decorative color theme.

Do not run a real expiry timer in the visual components. A mock clock or fixed
fixture date should produce stable output and tests.

## Phase 5: finish management feedback [complete]

Complete the interaction states already required for collection and tag work:

The deletion and recovery slice is complete: bookmark deletion has four-second
Undo, collection and tag deletion have named passive results, Trash restores
valid prior memberships with clear destination summaries, and Delete forever
has one named passive result. Mobile toasts are centered, and successful Undo
plays one semantic cue.

- Named success toasts for create and edit. Delete feedback is covered above.
- Edit Undo using the complete prior name and appearance snapshot.
- Optimistic updates with rollback on fixture-controlled failure.
- Error toasts with Retry that reopen the preserved draft.
- Stable toast IDs per managed item.
- Pending deletion that disables dismissal and the destructive action.
- Dirty-editor outside-press protection.
- Correct focus return for section, nested-collection, bookmark-picker, and delete
  entry points.
- Immediate inline trigger feedback before any toast appears.
- Consolidated feedback when one action changes several bookmarks, collections,
  or tags.
- Polite success announcements and assertive, actionable error announcements.
- Toast timers pause while the page is hidden or the toast has keyboard focus.
- Passive success toasts and timed Undo toasts use four seconds. Failure toasts
  with Retry remain open.
- Global toasts sit at the bottom right on desktop and bottom center on mobile.
- Successful bookmark Undo plays one restrained Undo cue after restoration. It
  does not reuse a generic success cue or play once per bookmark.
- Rapid updates for one managed item replace its existing toast instead of
  stacking messages.

Apply the same rules to bookmark edit and organization actions where the feature
contract requires them. Keep enrichment failures card-level with no toast.

## Phase 6: Settings, profile, onboarding, and account deletion [complete]

Build these as local UI flows without implementing authentication.

- Open Settings as a large modal dialog without changing the active library
  destination. Closing returns focus to the Settings button.
- Use a persistent left navigation for Profile, Account, and Demo on desktop.
  These are normal page buttons with `aria-current="page"`, not tabs. On mobile,
  open to a Settings page list, drill into one full-screen page, and provide a
  clear Back action. Do not use tab-list, tab, or tab-panel semantics.
- Keep the mobile navigation drawer open behind Settings so closing returns to
  the same navigation context.
- Keep Demo visually separate and label it as mock-only. Remove this section
  when real authentication and profile data replace its fixture adapter.
- Mock Email defaults and Google defaults. Cover email-prefix and Google-first-
  name username rules, generated avatars, Google avatars, uploaded avatars, and
  the correct avatar restored after an upload is removed.
- Trim username whitespace, require 1 to 40 Unicode characters, and do not mock
  uniqueness.
- Save username and avatar changes together. Keep valid avatar previews in the
  draft until save.
- Validate JPEG, PNG, WebP, and the 2 MB limit before showing a square local
  preview. Do not add an image crop editor.
- Preserve the profile draft across Settings pages. If the draft is dirty,
  outside press cannot close Settings and close or Escape asks whether to save
  or discard it.
- Preserve every field, selected avatar source, and valid local preview when a
  mock save fails. Retry uses the same draft.
- Use an indeterminate local status for fixture delays with no known percentage.
  Do not show fake upload progress.
- Build the skippable profile-setup flow from the shared profile fields. Untouched
  close uses the defaults. Changed drafts require confirmation before Skip or
  close replaces them with defaults.
- Add deterministic Demo controls for the profile fixture, next save result,
  next deletion result, profile-setup preview, and full fixture reset.
- Preserve the serious two-step account-deletion flow. The second confirmation
  requires the exact text `delete` before the destructive action becomes
  available.
- Block repeat submission and dismissal while deletion is pending. Keep errors
  in the confirmation until the user retries or corrects them.
- Keep a successful mock-deletion result visible in Settings until `Reset demo`
  acknowledges it. State that the mock did not delete an account or end a
  session.

Keep login and provider integration out of this phase. Do not implement Storage,
cascade deletion, session invalidation, or extension cleanup. The goal is to
settle every user-visible account and profile state that later phases do not
cover. Real backend work will replace the fixture adapter and remove Demo.

## Phase 7: import UI

Mock the dashboard side of the approved X archive import before any parser or
backend work.

- Add one Import page to Settings. `Import from X` in the Collections section
  menu opens Settings on that page. Both entry points use the same flow.
- Use a native file picker and accept `bookmark.js` or `bookmarks.js`. State
  before selection that this mock does not read or upload the chosen file.
- Keep the scroll-capture path separate. It belongs to the extension, requires
  user action at `x.com/i/bookmarks`, and is not part of this dashboard phase.
- Put temporary archive-content, initial-result, retry-result, and speed
  controls on the existing Demo page. Keep the Import page free of fixture
  controls.
- Mock valid, empty, malformed, mixed-validity, and duplicate archives. Do not
  add generic folder-depth or collection-name-conflict fixtures to this
  X-specific flow.
- Model the flow as explicit Choose, Review, Importing, Complete, and Error
  states.
- Review rows use mocked lookup results with author, handle, excerpt, and post
  URL. Fall back to the URL and post ID when preview data is unavailable. A
  failed preview never blocks saving a valid post URL.
- Select every eligible post by default. Let the user select or clear one row,
  select all rows, or clear the full selection before import. Lock selection
  when import starts and put the selected count in the Import button label.
- Keep duplicate URLs eligible and selected. Label posts already in the library
  and repeated inside the archive. The library-wide allow-duplicates rule still
  applies.
- Stop a malformed archive before Review and explain the error. Show a calm
  empty result for a valid archive with no bookmarks. For mixed input, skip
  malformed records, report the skipped count, and review the valid posts.
- Start Importing feedback at once. Show the current step and the processed
  count because Review establishes the selected total. The normal fixture
  finishes after a short readable delay; the slow fixture keeps progress visible
  for testing. Do not show imported state before a mock save succeeds.
- Let Settings close while an import runs. Keep the state in the dashboard
  controller, block a second import, and restore the current progress or result
  when the user returns. Do not offer Cancel after processing starts.
- Import successful posts into `X Bookmarks`. Reuse that collection when it
  exists. Otherwise create it with the X icon and Neutral color. Update the
  mock library and collection count after each successful save.
- When every post succeeds, Complete reports the imported count and duplicate
  count. When some fail, keep the successful posts, list the failures, and offer
  `Retry failed bookmarks`. When every post fails, commit nothing and offer
  `Retry import`.
- Keep separate deterministic initial and retry outcomes so Retry can succeed,
  partly fail, or fail again. Retry never imports a successful post twice.
- Keep the chosen archive, review selection, progress, and result when the user
  changes Settings pages or closes Settings. `Choose another file` resets the
  review. `Reset demo` clears the import state along with the other fixtures.
- On completion, offer `View imported bookmarks` and `Import another file`.
  Viewing the imported posts closes Settings and opens `X Bookmarks`.
- Announce completion once with a success, partial-failure, or error toast when
  Settings is closed. Do not repeat the toast when the user reopens Import.

Do not imply that the current mock reads or uploads a real archive unless that
behavior has been implemented and verified.

## Phase 8: backend, capture, transfer, and durability

Build the backend from the database upward. Use
`spec/integrations/supabase/phase-08/roadmap.md` as the implementation
order and stop after each verified slice.

Phase 8 includes:

- Supabase connection, migration, generated-type, client, auth, RLS, and core
  schema work.
- Small domain interfaces shared by mock and Supabase adapters.
- Durable job records and separate interactive and bulk queues.
- Command quick save and complete bookmark enrichment states.
- General browser HTML import, portable HTML export, lossless Reway JSON backup,
  and staged restore.
- Realtime notifications with authoritative refetch after gaps.
- Failure injection, load tests, observability, and mock replacement one feature
  at a time.

Do not add a broad backend change. Complete and verify Phase 8A before 8B, then
continue in the recorded order. Keep each mock path until its live adapter passes
the same contract tests.

## Phase 9: completion and stress pass

Audit the complete mock as one product:

- Remove every dead dashboard control and route.
- Cover first-use, empty, loading, partial, success, error, retry, and destructive
  states with deterministic fixtures.
- Test long titles, missing favicons, missing images, Arabic and accented names,
  duplicate names, many tags, many collections, and large result sets.
- Verify touch targets do not overlap at dense desktop and mobile widths.
- Verify fast repeated selection, menu, dialog, drawer, and reorder input cannot
  leave stale state behind.
- Run each frequent interaction at least ten times in quick succession. Test
  first use, the coached use, and the post-coaching use separately.
- Score selection, filtering, bulk actions, destructive dialogs, upload, and
  quick save against the eight microinteraction checks: discoverable trigger,
  visible trigger state, predictable rules, immediate feedback, proportional
  feedback, long-loop behavior, visible modes, and first-use clarity. Each must
  pass all eight before the mock is locked.
- Review every motion against its use frequency and purpose. Remove motion from
  frequent and keyboard paths even when the same effect looks good in isolation.
- Inspect occasional overlay motion at normal speed and in slow motion. Check
  interruption, transform origin, focus timing, enter and exit order, and reduced
  motion.
- Verify every destructive action states whether recovery is possible.
- Run static checks, tests, build, diff hygiene, and React Doctor.
- Run browser, keyboard, screen-reader, responsive, and rendered contrast checks
  only after the user gives explicit browser permission.

## Order summary

1. Dashboard destination model.
2. Real bookmark selection and bulk actions.
3. Tag filtering.
4. Uncollected.
5. Trash.
6. Finish management feedback.
7. Settings, profile, onboarding, and account deletion.
8. X archive import UI.
9. Backend, capture, transfer, and durability.
10. Completion and stress pass.

Do not skip ahead because a later screen looks easier. Each phase relies on state
and interaction rules established by the phases before it.

## Final lock gates

The dashboard and backend are ready for extension integration or production
planning only when:

- Every phase above is complete in order.
- No primary dashboard action is inert, misleading, or available only through an
  invisible trigger.
- Selection and reorder never overlap, and both modes remain visible and easy to
  exit.
- Every pending operation blocks duplicate submission and has a tested success,
  failure, interruption, and retry result.
- Frequent actions stay immediate and quiet. Major and destructive actions get
  feedback that matches their effect.
- No unapproved decorative animation, sound, haptic, fake progress, or adaptive
  behavior remains.
- No placeholder task, deferred interaction choice, or unresolved UI question
  remains in this file.
- The feature contract and this implementation order agree.
