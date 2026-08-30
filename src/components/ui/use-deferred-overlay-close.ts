"use client"

import * as React from "react"

export function useDeferredOverlayClose({
  onClosed,
  open,
}: {
  onClosed: () => void
  open: boolean
}): {
  onOpenChange: (open: boolean) => void
  onOpenChangeComplete: (open: boolean) => void
  open: boolean
  requestClose: () => void
} {
  const [closing, setClosing] = React.useState(false)
  const requestClose = (): void => setClosing(true)

  return {
    onOpenChange: (nextOpen) => {
      if (!nextOpen) requestClose()
    },
    onOpenChangeComplete: (nextOpen) => {
      if (nextOpen) return

      onClosed()
      setClosing(false)
    },
    open: open && !closing,
    requestClose,
  }
}
