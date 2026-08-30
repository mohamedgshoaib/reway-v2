import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useDeferredOverlayClose } from "@/components/ui/use-deferred-overlay-close"

afterEach(cleanup)

function DeferredCloseHarness({
  onClosed,
}: {
  onClosed: () => void
}): React.ReactElement {
  const [requestedOpen, setRequestedOpen] = React.useState(true)
  const overlay = useDeferredOverlayClose({
    onClosed: () => {
      setRequestedOpen(false)
      onClosed()
    },
    open: requestedOpen,
  })

  return (
    <>
      {requestedOpen ? <span>Stable dialog title</span> : null}
      <output aria-label="Overlay open">{String(overlay.open)}</output>
      <button onClick={overlay.requestClose} type="button">
        Start close
      </button>
      <button onClick={() => overlay.onOpenChangeComplete(false)} type="button">
        Finish close
      </button>
    </>
  )
}

describe("useDeferredOverlayClose", () => {
  it("keeps owner content mounted until the exit animation completes", () => {
    const onClosed = vi.fn<() => void>()
    render(<DeferredCloseHarness onClosed={onClosed} />)

    fireEvent.click(screen.getByRole("button", { name: "Start close" }))

    expect(screen.getByLabelText("Overlay open").textContent).toBe("false")
    expect(screen.getByText("Stable dialog title")).not.toBeNull()
    expect(onClosed).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Finish close" }))

    expect(screen.queryByText("Stable dialog title")).toBeNull()
    expect(onClosed).toHaveBeenCalledOnce()
  })
})
