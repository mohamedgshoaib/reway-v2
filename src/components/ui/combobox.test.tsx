import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

afterEach(cleanup)

const fruits = ["Apple", "Apricot", "Banana", "Cherry"]

describe("Combobox", () => {
  it("filters the visible item list as the input value changes", () => {
    const { container, getByRole } = render(
      // `inline` skips the Popup/Portal/Positioner chrome entirely — this is
      // the same minimal recipe Base UI's own ComboboxRoot tests use to
      // exercise filtering without floating-ui positioning in the loop.
      <Combobox inline items={fruits} open>
        <ComboboxInput showTrigger={false} />
        <ComboboxList>
          {(item: string) => <ComboboxItem value={item}>{item}</ComboboxItem>}
        </ComboboxList>
      </Combobox>
    )

    const itemLabels = () =>
      Array.from(container.querySelectorAll('[data-slot="combobox-item"]')).map(
        (el) => el.textContent
      )

    expect(itemLabels()).toEqual(fruits)

    const input = getByRole("combobox")
    fireEvent.change(input, { target: { value: "Ap" } })

    expect(itemLabels()).toEqual(["Apple", "Apricot"])
  })
})
