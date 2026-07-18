import { useEffect } from "react"

export function useMountEffect(effect: () => void | (() => void)): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- This hook intentionally runs only on mount.
  useEffect(effect, [])
}
