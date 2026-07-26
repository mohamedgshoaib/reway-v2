export type SortOption = "date" | "visits" | "alpha"
export type ViewMode = "list" | "grid" | "grid-image"

export interface MockTag {
  label: string
  value: string
}

export const mockTags: MockTag[] = [
  { label: "Engineering", value: "engineering" },
  { label: "Design", value: "design" },
  { label: "Product", value: "product" },
  { label: "Research", value: "research" },
  { label: "Marketing", value: "marketing" },
  { label: "AI", value: "ai" },
  { label: "Typography", value: "typography" },
  { label: "Accessibility", value: "accessibility" },
  { label: "Performance", value: "performance" },
  { label: "Writing", value: "writing" },
]

export const mockCollections = [
  { label: "Research", count: 24 },
  { label: "Reading list", count: 9 },
  { label: "Design references", count: 12 },
  { label: "Client work", count: 6 },
  { label: "Recipes", count: 14 },
  { label: "Travel planning", count: 8 },
  { label: "Home renovation", count: 5 },
  { label: "Job hunting", count: 11 },
  { label: "Book notes", count: 19 },
  { label: "Side project", count: 7 },
]

export interface MockBookmark {
  id: string
  title: string
  domain: string | null
  ogImage: string | null
  createdAt: number
  visitCount: number
  metadataStatus: "pending" | "enriched" | "failed"
  collections?: string[]
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
    metadataStatus: "enriched",
    visitCount: 3,
  },
  {
    id: "2",
    title: "Claude",
    domain: "claude.ai",
    ogImage: "https://picsum.photos/seed/claude/400/240",
    createdAt: daysAgo(0, 5),
    metadataStatus: "enriched",
    visitCount: 42,
  },
  {
    id: "3",
    title: "Perplexity",
    domain: "perplexity.ai",
    ogImage: "https://picsum.photos/seed/perplexity/400/240",
    createdAt: daysAgo(1),
    metadataStatus: "enriched",
    visitCount: 18,
  },
  {
    id: "4",
    title: "Google Gemini",
    domain: "gemini.google.com",
    ogImage: "https://picsum.photos/seed/gemini/400/240",
    createdAt: daysAgo(1, 6),
    metadataStatus: "enriched",
    visitCount: 5,
  },
  {
    id: "5",
    title: "A Practical Guide to Designing Dashboard Layouts",
    domain: "uxdesign.cc",
    ogImage: "https://picsum.photos/seed/uxdesign/400/240",
    createdAt: daysAgo(2),
    metadataStatus: "enriched",
    visitCount: 1,
  },
  {
    id: "6",
    title: "ChatGPT",
    domain: "chatgpt.com",
    ogImage: "https://picsum.photos/seed/chatgpt/400/240",
    createdAt: daysAgo(3),
    metadataStatus: "enriched",
    visitCount: 67,
  },
  {
    id: "7",
    title: "https://x.com/home",
    domain: null,
    ogImage: null,
    createdAt: daysAgo(4),
    metadataStatus: "pending",
    visitCount: 0,
  },
  {
    id: "8",
    title: "Aampe Design Case Study",
    domain: "aampe.com",
    ogImage: "https://picsum.photos/seed/aampe/400/240",
    createdAt: daysAgo(5),
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
  },
  {
    id: "12",
    title: "Linear",
    domain: "linear.app",
    ogImage: "https://picsum.photos/seed/linear/400/240",
    createdAt: daysAgo(7),
    metadataStatus: "enriched",
    visitCount: 15,
  },
  {
    id: "13",
    title: "Notion",
    domain: "notion.so",
    ogImage: "https://picsum.photos/seed/notion/400/240",
    createdAt: daysAgo(9),
    metadataStatus: "enriched",
    visitCount: 22,
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
  } else {
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
