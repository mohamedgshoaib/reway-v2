# Phase 8D implementation plan

## Status

- Complete.

## Execution steps

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
