import {
  normalizeCollectionName,
  type Collection,
  type CollectionId,
} from "@/dev/dashboard-ui/collection-hierarchy"
import type { MockBookmark } from "@/dev/dashboard-ui/mock-bookmarks"

export const X_BOOKMARKS_COLLECTION_NAME = "X Bookmarks"
export const X_BOOKMARKS_COLLECTION_ID = "x-bookmarks"

export type XArchiveFixture =
  | "valid"
  | "empty"
  | "malformed"
  | "mixed"
  | "duplicates"

export type XImportOutcome = "success" | "partial" | "failure"
export type XImportSpeed = "fast" | "slow"
export type XImportDuplicateKind = "archive" | "library"

export interface XImportPost {
  authorHandle: string | null
  authorName: string | null
  duplicateKinds: readonly XImportDuplicateKind[]
  entryId: string
  excerpt: string | null
  postId: string
  previewAvailable: boolean
  url: string
}

export interface XImportReview {
  fileName: string
  posts: readonly XImportPost[]
  skippedCount: number
}

export type XArchiveReviewResult =
  | { kind: "error"; fileName: string; message: string }
  | { kind: "empty"; fileName: string }
  | { kind: "review"; review: XImportReview }

interface XImportPostFixture extends Omit<XImportPost, "duplicateKinds"> {}

const VALID_ARCHIVE_POSTS: readonly XImportPostFixture[] = [
  {
    authorHandle: "@mira_builds",
    authorName: "Mira Hassan",
    entryId: "x-entry-1",
    excerpt: "A useful breakdown of keyboard-first collection tools.",
    postId: "1896307124452102194",
    previewAvailable: true,
    url: "https://x.com/mira_builds/status/1896307124452102194",
  },
  {
    authorHandle: "@samir_codes",
    authorName: "Samir Nassar",
    entryId: "x-entry-2",
    excerpt: "The smallest loading states often explain the most.",
    postId: "1896281057158295792",
    previewAvailable: true,
    url: "https://x.com/samir_codes/status/1896281057158295792",
  },
  {
    authorHandle: "@layla_reads",
    authorName: "Layla Farid",
    entryId: "x-entry-3",
    excerpt: "Notes on building a calmer research library.",
    postId: "1896018827506114821",
    previewAvailable: true,
    url: "https://x.com/layla_reads/status/1896018827506114821",
  },
  {
    authorHandle: null,
    authorName: null,
    entryId: "x-entry-4",
    excerpt: null,
    postId: "1895840301990205520",
    previewAvailable: false,
    url: "https://x.com/i/web/status/1895840301990205520",
  },
  {
    authorHandle: "@nour_product",
    authorName: "Nour Ibrahim",
    entryId: "x-entry-5",
    excerpt: "A clear account of why bulk actions need visible scope.",
    postId: "1895506130321240529",
    previewAvailable: true,
    url: "https://x.com/nour_product/status/1895506130321240529",
  },
  {
    authorHandle: "@omar_designs",
    authorName: "Omar Adel",
    entryId: "x-entry-6",
    excerpt: "Saved for the section on compact dashboard navigation.",
    postId: "1895327799844026801",
    previewAvailable: true,
    url: "https://x.com/omar_designs/status/1895327799844026801",
  },
]

const ACCEPTED_ARCHIVE_FILE_NAMES = new Set(["bookmark.js", "bookmarks.js"])

export function getXArchiveFileNameError(fileName: string): string | null {
  const normalizedFileName = fileName.trim().toLocaleLowerCase()
  return ACCEPTED_ARCHIVE_FILE_NAMES.has(normalizedFileName)
    ? null
    : "Choose bookmark.js or bookmarks.js from your X archive."
}

function getFixturePosts(
  fixture: XArchiveFixture
): readonly XImportPostFixture[] {
  if (fixture === "empty" || fixture === "malformed") return []
  if (fixture === "mixed") return VALID_ARCHIVE_POSTS.slice(0, 4)
  if (fixture !== "duplicates") return VALID_ARCHIVE_POSTS

  return [
    ...VALID_ARCHIVE_POSTS,
    {
      ...VALID_ARCHIVE_POSTS[1],
      entryId: "x-entry-duplicate-2",
    },
  ]
}

export function createXArchiveReview({
  existingUrls,
  fileName,
  fixture,
}: {
  existingUrls: ReadonlySet<string>
  fileName: string
  fixture: XArchiveFixture
}): XArchiveReviewResult {
  const fileNameError = getXArchiveFileNameError(fileName)
  if (fileNameError) {
    return { fileName, kind: "error", message: fileNameError }
  }
  if (fixture === "malformed") {
    return {
      fileName,
      kind: "error",
      message: "This file does not contain a readable X bookmark archive.",
    }
  }
  if (fixture === "empty") return { fileName, kind: "empty" }

  const fixturePosts = getFixturePosts(fixture)
  const urlCounts = new Map<string, number>()
  for (const post of fixturePosts) {
    urlCounts.set(post.url, (urlCounts.get(post.url) ?? 0) + 1)
  }

  const posts = fixturePosts.map((post): XImportPost => {
    const duplicateKinds: XImportDuplicateKind[] = []
    if (existingUrls.has(post.url)) duplicateKinds.push("library")
    if ((urlCounts.get(post.url) ?? 0) > 1) duplicateKinds.push("archive")
    return { ...post, duplicateKinds }
  })

  return {
    kind: "review",
    review: {
      fileName,
      posts,
      skippedCount: fixture === "mixed" ? 2 : 0,
    },
  }
}

export function createXImportSelection(
  posts: readonly XImportPost[]
): ReadonlySet<string> {
  return new Set(posts.map((post) => post.entryId))
}

export function setXImportPostSelected({
  entryId,
  selected,
  selectedIds,
}: {
  entryId: string
  selected: boolean
  selectedIds: ReadonlySet<string>
}): ReadonlySet<string> {
  const nextSelectedIds = new Set(selectedIds)
  if (selected) nextSelectedIds.add(entryId)
  else nextSelectedIds.delete(entryId)
  return nextSelectedIds
}

export function planXImportFailures(
  entryIds: readonly string[],
  outcome: XImportOutcome
): ReadonlySet<string> {
  if (outcome === "success") return new Set()
  if (outcome === "failure") return new Set(entryIds)
  if (entryIds.length <= 1) return new Set(entryIds)

  const failedIds = new Set(
    entryIds.filter((_entryId, index) => (index + 1) % 3 === 0)
  )
  if (failedIds.size === 0) failedIds.add(entryIds.at(-1) as string)
  return failedIds
}

export function ensureXBookmarksCollection(
  collections: readonly Collection[],
  createdAt: number
): { collectionId: CollectionId; collections: Collection[]; created: boolean } {
  const normalizedTarget = normalizeCollectionName(
    X_BOOKMARKS_COLLECTION_NAME
  ).toLocaleLowerCase()
  const existing = collections.find(
    (collection) =>
      normalizeCollectionName(collection.name).toLocaleLowerCase() ===
      normalizedTarget
  )
  if (existing) {
    return {
      collectionId: existing.id,
      collections: [...collections],
      created: false,
    }
  }

  return {
    collectionId: X_BOOKMARKS_COLLECTION_ID,
    collections: [
      {
        color: { kind: "palette", value: "neutral" },
        createdAt,
        icon: "x",
        id: X_BOOKMARKS_COLLECTION_ID,
        name: X_BOOKMARKS_COLLECTION_NAME,
        order: 0,
        parentId: null,
      },
      ...collections.map((collection) =>
        collection.parentId === null
          ? { ...collection, order: collection.order + 1 }
          : collection
      ),
    ],
    created: true,
  }
}

export function createImportedXBookmark({
  collectionId,
  createdAt,
  importId,
  post,
}: {
  collectionId: CollectionId
  createdAt: number
  importId: string
  post: XImportPost
}): MockBookmark {
  return {
    collections: [collectionId],
    createdAt,
    domain: "x.com",
    id: `x-import-${importId}-${post.entryId}`,
    metadataStatus: post.previewAvailable ? "enriched" : "failed",
    ogImage: null,
    title: post.excerpt ?? post.url,
    url: post.url,
    visitCount: 0,
  }
}
