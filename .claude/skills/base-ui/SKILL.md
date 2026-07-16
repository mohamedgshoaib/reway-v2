---
name: base-ui
description: Use when working with Base UI (`@base-ui/react`) components, APIs, examples, releases, or migration details. First read https://base-ui.com/llms.txt as the live documentation index, then open only the exact handbook, component, utility, or release page needed for the task.
---

# Base UI

Use Base UI's live docs instead of memory.

## Workflow

1. Open `https://base-ui.com/llms.txt` first.
2. Find the exact doc URL needed for the task.
3. Open only that page, not the whole docs set.
4. Prefer current Base UI docs over remembered patterns when behavior or APIs might have changed.

## Doc Selection

- Component work: open the matching `react/components/*.md` page
- Styling, animation, composition, forms, or TypeScript questions: open the matching `react/handbook/*.md` page
- Release checks or migration questions: open `react/overview/releases.md` and then the specific release page if needed
- Package-level orientation: use `react/overview/*.md`
- Utility work: open the matching `react/utils/*.md` page

## Rules

- Fetch only the pages needed for the current question
- Adapt examples to the local codebase instead of copying blindly
- If Base UI examples assume Tailwind CSS v4 but the project uses v3, convert unsupported utilities before applying them
- Prefer repo conventions when wrapping or styling Base UI primitives
