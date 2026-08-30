import type { CollectionIconName } from "@/dev/dashboard-ui/collection-hierarchy"

export type CollectionIconGroupId = "general" | "work" | "learning" | "personal"

export interface CollectionIconOption {
  aliases: readonly string[]
  icon: CollectionIconName
  label: string
}

export interface CollectionIconGroup {
  id: CollectionIconGroupId
  label: string
  shortLabel: string
  options: readonly CollectionIconOption[]
}

export const collectionIconGroups: readonly CollectionIconGroup[] = [
  {
    id: "general",
    label: "General",
    shortLabel: "General",
    options: [
      { aliases: ["directory"], icon: "folder", label: "Folder" },
      { aliases: ["save"], icon: "bookmark", label: "Bookmark" },
      { aliases: ["storage"], icon: "archive", label: "Archive" },
      { aliases: ["favorite"], icon: "star", label: "Star" },
      { aliases: ["love", "favorite"], icon: "heart", label: "Heart" },
      { aliases: ["layers"], icon: "stack", label: "Stack" },
    ],
  },
  {
    id: "work",
    label: "Work",
    shortLabel: "Work",
    options: [
      { aliases: ["job", "career"], icon: "briefcase", label: "Briefcase" },
      { aliases: ["person", "client"], icon: "user", label: "Person" },
      {
        aliases: ["office", "company"],
        icon: "buildings",
        label: "Buildings",
      },
      { aliases: ["date", "schedule"], icon: "calendar", label: "Calendar" },
      { aliases: ["tasks"], icon: "clipboard", label: "Clipboard" },
      { aliases: ["twitter", "social"], icon: "x", label: "X logo" },
    ],
  },
  {
    id: "learning",
    label: "Learning & Creative",
    shortLabel: "Learning",
    options: [
      { aliases: ["reading", "learn"], icon: "book", label: "Book" },
      { aliases: ["notes"], icon: "notebook", label: "Notebook" },
      { aliases: ["search", "study"], icon: "research", label: "Research" },
      {
        aliases: ["art", "design"],
        icon: "paintbrush",
        label: "Paintbrush",
      },
      {
        aliases: ["development", "programming"],
        icon: "code",
        label: "Code",
      },
      { aliases: ["photo", "photography"], icon: "camera", label: "Camera" },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    shortLabel: "Personal",
    options: [
      { aliases: ["house"], icon: "home", label: "Home" },
      {
        aliases: ["recipe", "food", "kitchen"],
        icon: "cooking",
        label: "Cooking",
      },
      { aliases: ["trip", "flight"], icon: "airplane", label: "Travel" },
      {
        aliases: ["map", "place", "pin"],
        icon: "location",
        label: "Location",
      },
      {
        aliases: ["cart", "shop", "store"],
        icon: "shopping",
        label: "Shopping",
      },
      {
        aliases: ["gym", "workout", "exercise"],
        icon: "barbell",
        label: "Fitness",
      },
    ],
  },
]

const collectionIconLabels = new Map<CollectionIconName, string>(
  collectionIconGroups.flatMap((group) =>
    group.options.map((option) => [option.icon, option.label] as const)
  )
)

export function getCollectionIconLabel(icon: CollectionIconName): string {
  return collectionIconLabels.get(icon) ?? "Folder"
}
