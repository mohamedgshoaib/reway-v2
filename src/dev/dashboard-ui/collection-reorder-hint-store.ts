const STORAGE_KEY = "reway.collection-nesting-hint-seen"

function readStoredValue(): boolean {
  if (typeof localStorage === "undefined") return false

  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

let hasSeenHint = readStoredValue()
const listeners = new Set<() => void>()

export function getCollectionNestingHintSeen(): boolean {
  return hasSeenHint
}

export function getDefaultCollectionNestingHintSeen(): boolean {
  return false
}

export function subscribeToCollectionNestingHint(
  listener: () => void
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function markCollectionNestingHintSeen(): void {
  if (hasSeenHint) return

  hasSeenHint = true
  try {
    localStorage.setItem(STORAGE_KEY, "true")
  } catch {
    // The hint stays dismissed for this session when storage is unavailable.
  }

  for (const listener of listeners) listener()
}
