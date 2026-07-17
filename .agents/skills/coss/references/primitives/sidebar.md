# coss Sidebar

## When to use

- Persistent app shell navigation and grouped links.
- Collapsible/structured side navigation for dashboard layouts.

## Install

```bash
npx shadcn@latest add @coss/sidebar
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
```

## Minimal pattern

```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>Workspace</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>{/* Main page content */}</SidebarInset>
</SidebarProvider>
```

## Patterns from coss particles

### Key patterns

Sidebar with grouped navigation and footer:

```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <h2 className="text-lg font-semibold">App Name</h2>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<a href="/dashboard" />}>
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton render={<a href="/projects" />}>
                <span>Projects</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <span>Settings</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
  <SidebarInset>{/* Page content */}</SidebarInset>
</SidebarProvider>
```

Key composition rules:
- Wrap app with `SidebarProvider` at the layout level.
- Use `SidebarContent` (not "SidebarPanel") as the scrollable body between header/footer. It uses `ScrollArea` with `fill` so flex children (e.g. `mt-auto` footers) can pin to the bottom.
- Navigation items use `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton`.
- For link items, use `render` composition: `<SidebarMenuButton render={<a href="..." />}>`. Do not use `asChild` -- sidebar follows the same `render` pattern as all other coss primitives.
- Use `SidebarTrigger` for the collapse/expand toggle.
- Use `SidebarInset` for the main content area next to the sidebar.
- `SidebarRail` adds a slim hover-to-expand rail in collapsed state.

### More examples

See `p-toolbar-1`, `p-breadcrumb-1`, `p-tabs-1`, `p-menu-1` for related app-shell patterns.

## Common pitfalls

- Using non-existent parts like "SidebarPanel" or "SidebarItem" -- the correct names are `SidebarContent` and `SidebarMenuItem`.
- Forgetting `SidebarProvider` wrapper, which manages collapse state and mobile responsiveness.
- Skipping the `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton` hierarchy for nav items.
- Missing responsive collapse strategy for narrow/mobile layouts.
- Replacing `SidebarContent`'s scroll area with a raw `ScrollArea` without `fill` when the body uses `mt-auto` to pin footers—use `fill` (see scroll-area primitive docs).
- **`SidebarMenuButton` label text must be the last child wrapped in a `<span>`, never a raw text node.** The button's own class list ends with `[&>span:last-child]:truncate`, which single-lines and ellipsizes the label as the button's width animates on collapse (`transition-[width,height,padding]`). Passing text directly (`<Icon /> Label`) means there's no `<span>` for that rule to target, so the label falls back to default text wrapping — as the button shrinks toward the icon-only width, the label visibly reflows into broken multi-line text instead of clipping cleanly. **In this project, use `SidebarMenuButtonLabel` rather than a bare `<span>`** — it renders a real `<span>` (so `truncate` still applies) and adds the opacity fade the clip alone lacks.

## Local divergences from upstream (survive a re-install!)

`sidebar.tsx` has **no official docs page and no particles** — it exists in the coss registry (`@coss/sidebar`) but isn't published under `apps/ui/content/docs/components`. The installed file was byte-diffed against the upstream registry source and matched exactly apart from formatting, import aliasing, and the project-wide lucide→phosphor icon swap. The changes below were made *after* that check, so `npx shadcn@latest add @coss/sidebar` would silently revert them:

- **`SidebarMenuButtonLabel`** — added export (`m.span`, opacity fade on collapse). Not upstream.
- **`SidebarMenuBadge`** — converted from `div` to `m.div`; dropped `group-data-[collapsible=icon]:hidden` in favour of an animated opacity. The badge is `absolute right-1`, so while the row is still icon-width it physically sits **on top of the menu icon** — the hidden→visible snap made counts pop in over the icons mid-expand. The fade is deliberately asymmetric (`delay: 0.18, duration: 0.12` in; `duration: 0.08` out) so it stays invisible until the 200ms width transition has cleared the icon. Verified via frame-sampled rect intersection: 0px visible overlap.
- **Easing** — all four `ease-linear` transitions (`sidebar-gap`, `sidebar-container`, `SidebarRail`, `SidebarGroupLabel`) → `ease-in-out-strong`; `sidebarMenuButtonVariants` gained explicit `duration-200 ease-in-out-strong` (it previously fell back to Tailwind's 150ms default, desyncing it from the container's 200ms).

Both motion-driven parts need a `LazyMotion` ancestor — mounted once in `src/routes/__root.tsx` with `strict`, so use `m.*`, never `motion.*`.

Known-deferred: the collapse animates `width`/`padding` (layout-thrashing rather than compositor-only). Left as upstream on purpose; see `plans/README.md`.

## Useful particle references

- sidebar-specific particles: no dedicated `p-sidebar-*` family currently.
- app-shell references: `p-toolbar-1`, `p-breadcrumb-1`, `p-tabs-1`, `p-menu-1`
