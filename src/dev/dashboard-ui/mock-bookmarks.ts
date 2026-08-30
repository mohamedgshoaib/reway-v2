import type {
  Collection,
  CollectionId,
} from "@/dev/dashboard-ui/collection-hierarchy"
import type { Tag } from "@/dev/dashboard-ui/tag-model"

export type SortOption = "date" | "visits" | "alpha" | "custom"
export type ViewMode = "list" | "grid" | "grid-image"

export type MockTag = Tag

export const mockTags: MockTag[] = [
  {
    color: { kind: "palette", value: "blue" },
    createdAt: 10,
    id: "engineering",
    name: "Engineering",
    order: 2,
  },
  {
    color: { kind: "palette", value: "violet" },
    createdAt: 9,
    id: "design",
    name: "Design",
    order: 1,
  },
  {
    color: { kind: "palette", value: "amber" },
    createdAt: 8,
    id: "product",
    name: "Product",
    order: 7,
  },
  {
    color: { kind: "palette", value: "teal" },
    createdAt: 7,
    id: "research",
    name: "Research",
    order: 8,
  },
  {
    color: { kind: "palette", value: "rose" },
    createdAt: 6,
    id: "marketing",
    name: "Marketing",
    order: 4,
  },
  {
    color: { kind: "palette", value: "indigo" },
    createdAt: 5,
    id: "ai",
    name: "AI",
    order: 0,
  },
  {
    color: { kind: "palette", value: "orange" },
    createdAt: 4,
    id: "typography",
    name: "Typography",
    order: 9,
  },
  {
    color: { kind: "palette", value: "green" },
    createdAt: 3,
    id: "accessibility",
    name: "Accessibility",
    order: 3,
  },
  {
    color: { kind: "palette", value: "cyan" },
    createdAt: 2,
    id: "performance",
    name: "Performance",
    order: 5,
  },
  {
    color: { kind: "palette", value: "lime" },
    createdAt: 1,
    id: "writing",
    name: "Writing",
    order: 6,
  },
]

export const mockCollections: Collection[] = [
  {
    color: { kind: "palette", value: "teal" },
    createdAt: 12,
    icon: "research",
    id: "research",
    name: "Research",
    order: 0,
    parentId: null,
  },
  {
    color: { kind: "palette", value: "blue" },
    createdAt: 11,
    icon: "book",
    id: "reading-list",
    name: "Reading list",
    order: 0,
    parentId: "research",
  },
  {
    color: { kind: "palette", value: "violet" },
    createdAt: 10,
    icon: "paintbrush",
    id: "design-references",
    name: "Design references",
    order: 1,
    parentId: "research",
  },
  {
    color: { kind: "palette", value: "rose" },
    createdAt: 9,
    icon: "folder",
    id: "media",
    name: "Media",
    order: 1,
    parentId: null,
  },
  {
    color: { kind: "palette", value: "red" },
    createdAt: 8,
    icon: "folder",
    id: "streaming-platforms",
    name: "Streaming platforms",
    order: 0,
    parentId: "media",
  },
  {
    color: { kind: "palette", value: "amber" },
    createdAt: 7,
    icon: "notebook",
    id: "book-notes",
    name: "Book notes",
    order: 1,
    parentId: "media",
  },
  {
    color: { kind: "palette", value: "indigo" },
    createdAt: 6,
    icon: "user",
    id: "client-work",
    name: "Client work",
    order: 2,
    parentId: null,
  },
  {
    color: { kind: "palette", value: "orange" },
    createdAt: 5,
    icon: "cooking",
    id: "recipes",
    name: "Recipes",
    order: 3,
    parentId: null,
  },
  {
    color: { kind: "palette", value: "cyan" },
    createdAt: 4,
    icon: "airplane",
    id: "travel-planning",
    name: "Travel planning",
    order: 4,
    parentId: null,
  },
  {
    color: { kind: "palette", value: "green" },
    createdAt: 3,
    icon: "home",
    id: "home-renovation",
    name: "Home renovation",
    order: 5,
    parentId: null,
  },
  {
    color: { kind: "palette", value: "lime" },
    createdAt: 2,
    icon: "briefcase",
    id: "job-hunting",
    name: "Job hunting",
    order: 6,
    parentId: null,
  },
  {
    color: { kind: "palette", value: "neutral" },
    createdAt: 1,
    icon: "code",
    id: "side-project",
    name: "Side project",
    order: 7,
    parentId: null,
  },
]

export interface MockBookmark {
  id: string
  title: string
  domain: string | null
  ogImage: string | null
  createdAt: number
  visitCount: number
  metadataStatus: "pending" | "enriched" | "failed"
  trashedAt?: number
  collections?: CollectionId[]
  tags?: string[]
}

function daysAgo(days: number, hours = 0): number {
  return Date.now() - (days * 24 + hours) * 60 * 60 * 1000
}

export const mockBookmarks: MockBookmark[] = [
  {
    id: "1",
    title: "Recollect — Save, Curate, Recollect.",
    domain: "recollect.so",
    ogImage: "https://picsum.photos/seed/recollect/400/240",
    createdAt: daysAgo(0, 2),
    collections: ["research", "design-references"],
    metadataStatus: "enriched",
    visitCount: 3,
  },
  {
    id: "2",
    title: "Claude",
    domain: "claude.ai",
    ogImage: "https://picsum.photos/seed/claude/400/240",
    createdAt: daysAgo(0, 5),
    collections: ["research"],
    metadataStatus: "enriched",
    visitCount: 42,
  },
  {
    id: "3",
    title: "Perplexity",
    domain: "perplexity.ai",
    ogImage: "https://picsum.photos/seed/perplexity/400/240",
    createdAt: daysAgo(1),
    collections: ["research", "reading-list"],
    metadataStatus: "enriched",
    visitCount: 18,
  },
  {
    id: "4",
    title: "Google Gemini",
    domain: "gemini.google.com",
    ogImage: "https://picsum.photos/seed/gemini/400/240",
    createdAt: daysAgo(1, 6),
    collections: ["research"],
    metadataStatus: "enriched",
    visitCount: 5,
  },
  {
    id: "5",
    title: "A Practical Guide to Designing Dashboard Layouts",
    domain: "uxdesign.cc",
    ogImage: "https://picsum.photos/seed/uxdesign/400/240",
    createdAt: daysAgo(2),
    collections: ["research", "design-references"],
    metadataStatus: "enriched",
    visitCount: 1,
  },
  {
    id: "6",
    title: "ChatGPT",
    domain: "chatgpt.com",
    ogImage: "https://picsum.photos/seed/chatgpt/400/240",
    createdAt: daysAgo(3),
    collections: ["research"],
    metadataStatus: "enriched",
    visitCount: 67,
  },
  {
    id: "7",
    title: "https://x.com/home",
    domain: null,
    ogImage: null,
    createdAt: daysAgo(4),
    collections: ["research"],
    metadataStatus: "pending",
    visitCount: 0,
  },
  {
    id: "8",
    title: "Aampe Design Case Study",
    domain: "aampe.com",
    ogImage: "https://picsum.photos/seed/aampe/400/240",
    createdAt: daysAgo(5),
    collections: ["research", "design-references"],
    metadataStatus: "enriched",
    visitCount: 9,
  },
  {
    id: "9",
    title: "Next.js Dev Tools",
    domain: "nextjs.org",
    ogImage: "https://picsum.photos/seed/nextjs/400/240",
    createdAt: daysAgo(45),
    metadataStatus: "enriched",
    visitCount: 24,
  },
  {
    id: "10",
    title: "Blog",
    domain: "overreacted.io",
    // Missing OG image on an otherwise-enriched bookmark — a real
    // enrichment-pipeline outcome, not just a pending/failed state.
    ogImage: null,
    createdAt: daysAgo(60),
    metadataStatus: "enriched",
    visitCount: 2,
  },
  {
    id: "11",
    title: "Figma",
    domain: "figma.com",
    ogImage: "https://picsum.photos/seed/figma/400/240",
    createdAt: daysAgo(6),
    metadataStatus: "enriched",
    visitCount: 31,
    collections: ["client-work", "design-references"],
  },
  {
    id: "12",
    title: "Linear",
    domain: "linear.app",
    ogImage: "https://picsum.photos/seed/linear/400/240",
    createdAt: daysAgo(7),
    metadataStatus: "enriched",
    visitCount: 15,
    collections: ["client-work"],
  },
  {
    id: "13",
    title: "Notion",
    domain: "notion.so",
    ogImage: "https://picsum.photos/seed/notion/400/240",
    createdAt: daysAgo(9),
    metadataStatus: "enriched",
    visitCount: 22,
    collections: ["book-notes"],
  },
  {
    id: "14",
    title: "Vercel",
    domain: "vercel.com",
    ogImage: "https://picsum.photos/seed/vercel/400/240",
    createdAt: daysAgo(12),
    metadataStatus: "enriched",
    visitCount: 8,
  },
  {
    id: "15",
    title: "Base UI Documentation",
    domain: "base-ui.com",
    ogImage: "https://picsum.photos/seed/baseui/400/240",
    createdAt: daysAgo(15),
    metadataStatus: "enriched",
    visitCount: 40,
    collections: ["reading-list"],
  },
  {
    id: "16",
    title: "Tailwind CSS",
    domain: "tailwindcss.com",
    ogImage: "https://picsum.photos/seed/tailwind/400/240",
    createdAt: daysAgo(18),
    metadataStatus: "enriched",
    visitCount: 28,
  },
  {
    id: "17",
    title: "TanStack",
    domain: "tanstack.com",
    ogImage: "https://picsum.photos/seed/tanstack/400/240",
    createdAt: daysAgo(22),
    metadataStatus: "enriched",
    visitCount: 19,
  },
  {
    id: "18",
    title: "Supabase",
    domain: "supabase.com",
    ogImage: "https://picsum.photos/seed/supabase/400/240",
    createdAt: daysAgo(28),
    metadataStatus: "enriched",
    visitCount: 12,
  },
  {
    id: "19",
    title: "Phosphor Icons",
    domain: "phosphoricons.com",
    ogImage: "https://picsum.photos/seed/phosphor/400/240",
    createdAt: daysAgo(35),
    metadataStatus: "enriched",
    visitCount: 6,
  },
  {
    id: "20",
    title: "Radix Colors",
    domain: "radix-ui.com",
    ogImage: "https://picsum.photos/seed/radix/400/240",
    createdAt: daysAgo(50),
    metadataStatus: "enriched",
    visitCount: 4,
  },
]

export function sortBookmarks(
  bookmarks: MockBookmark[],
  sort: SortOption
): MockBookmark[] {
  const sorted = [...bookmarks]

  if (sort === "date") {
    sorted.sort((a, b) => b.createdAt - a.createdAt)
  } else if (sort === "visits") {
    sorted.sort((a, b) => b.visitCount - a.visitCount)
  } else if (sort === "alpha") {
    sorted.sort((a, b) => a.title.localeCompare(b.title))
  }

  return sorted
}

export function groupByRecency(
  bookmarks: MockBookmark[]
): { label: string; items: MockBookmark[] }[] {
  const weekAgo = daysAgo(7)
  const thisWeek = bookmarks.filter((b) => b.createdAt >= weekAgo)
  const older = bookmarks.filter((b) => b.createdAt < weekAgo)

  return [
    { label: "This week", items: thisWeek },
    { label: "Older", items: older },
  ].filter((group) => group.items.length > 0)
}
