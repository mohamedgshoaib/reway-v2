# coss Frame

## When to use

- Bordered app surfaces around content blocks.
- Container wrapper for data components like table, cards, and panes.

## Install

```bash
npx shadcn@latest add @coss/frame
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame"
```

## Minimal pattern

```tsx
<Frame>
  <FrameHeader>
    <FrameTitle>Title</FrameTitle>
    <FrameDescription>Description</FrameDescription>
  </FrameHeader>
  <FramePanel>Content</FramePanel>
  <FrameFooter>Footer</FrameFooter>
</Frame>
```

## Patterns from coss particles

### Key patterns

Frame with header actions:

```tsx
<Frame>
  <FrameHeader className="flex items-center justify-between">
    <div>
      <FrameTitle>Users</FrameTitle>
      <FrameDescription>Manage team members.</FrameDescription>
    </div>
    <Button size="sm">Add User</Button>
  </FrameHeader>
  <FramePanel>{/* Table or list content */}</FramePanel>
  <FrameFooter>
    <p className="text-muted-foreground text-sm">Showing 1-10 of 100</p>
  </FrameFooter>
</Frame>
```

Use `Frame` to normalize border/radius around heterogeneous inner content (tables, lists, cards).

### More examples

See `p-frame-1` through `p-frame-3` for basic and separated panel patterns.

## Common pitfalls

- Using nested frames excessively, causing dense double borders.
- Applying frame as layout grid replacement instead of content surface wrapper.
- Forgetting to align inner component width expectations (table/list full width).
- **`FrameHeader`/`FrameFooter` are direct children of `Frame`, siblings of `FramePanel` — never nested inside it.** Both already carry `px-5 py-4`; nesting one inside `FramePanel` (which has its own `p-5`) doubles the padding and invites a `className="p-0"` patch to compensate — that patch also strips the component's horizontal padding, leaving text flush against the edge.

## Useful particle references

- separated panels: `p-frame-3`
