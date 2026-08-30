import {
  appearancePalette,
  type AppearanceColor,
  type AppearancePaletteColor,
} from "@/dev/dashboard-ui/appearance-color"

export type TagId = string
export type TagOrderMode = "newest" | "alpha" | "custom"

export const tagPalette = appearancePalette

export type TagPaletteColor = AppearancePaletteColor

export type TagColor = AppearanceColor

export interface Tag {
  color: TagColor
  createdAt: number
  id: TagId
  name: string
  order: number
}

export interface TagDraft {
  color: TagColor
  name: string
}

const MAX_TAG_NAME_LENGTH = 24
const INVALID_TAG_NAME = /[\p{Cc}\p{Cf}]/u
export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

export function getTagNameError(
  tags: readonly Tag[],
  name: string,
  editingId?: TagId
): string | null {
  const normalizedName = normalizeTagName(name)

  if (!normalizedName) return "Enter a tag name."
  if (Array.from(normalizedName).length > MAX_TAG_NAME_LENGTH) {
    return "Use 24 characters or fewer."
  }
  if (INVALID_TAG_NAME.test(normalizedName)) {
    return "Remove line breaks or control characters."
  }

  const comparison = normalizedName.toLocaleLowerCase()
  const duplicate = tags.some(
    (tag) =>
      tag.id !== editingId &&
      normalizeTagName(tag.name).toLocaleLowerCase() === comparison
  )

  return duplicate ? "A tag with this name already exists." : null
}

export function getLeastUsedTagColor(tags: readonly Tag[]): TagPaletteColor {
  const usage = new Map<TagPaletteColor, number>(
    tagPalette.map((color) => [color, 0])
  )

  for (const tag of tags) {
    usage.set(tag.color.value, (usage.get(tag.color.value) ?? 0) + 1)
  }

  return tagPalette.reduce((leastUsed, color) =>
    (usage.get(color) ?? 0) < (usage.get(leastUsed) ?? 0) ? color : leastUsed
  )
}

export function sortTags(tags: readonly Tag[], orderMode: TagOrderMode): Tag[] {
  return [...tags].sort((first, second) => {
    if (orderMode === "alpha") {
      return first.name.localeCompare(second.name, undefined, {
        sensitivity: "base",
      })
    }
    if (orderMode === "newest") return second.createdAt - first.createdAt
    return first.order - second.order || second.createdAt - first.createdAt
  })
}

export function moveTag(
  tags: readonly Tag[],
  sourceId: TagId,
  targetIndex: number
): Tag[] {
  const orderedTags = sortTags(tags, "custom")
  const sourceIndex = orderedTags.findIndex((tag) => tag.id === sourceId)
  if (sourceIndex === -1) return [...tags]

  const nextIndex = Math.max(0, Math.min(targetIndex, orderedTags.length - 1))
  const [source] = orderedTags.splice(sourceIndex, 1)
  orderedTags.splice(nextIndex, 0, source)

  return orderedTags.map((tag, order) => ({ ...tag, order }))
}
