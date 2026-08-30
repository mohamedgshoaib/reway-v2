"use client"

import { Fragment } from "react"
import type * as React from "react"

import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxSeparator,
} from "@/components/ui/combobox"
import type { AppearanceColor } from "@/dev/dashboard-ui/appearance-color"
import type { CollectionIconName } from "@/dev/dashboard-ui/collection-hierarchy"
import { CollectionIcon } from "@/dev/dashboard-ui/collection-icon"
import {
  collectionIconGroups,
  type CollectionIconOption,
} from "@/dev/dashboard-ui/collection-icon-options"

const collectionIconOptions = collectionIconGroups.flatMap(
  (group) => group.options
)
const collectionIconComboboxGroups = collectionIconGroups.map((group) => ({
  items: group.options,
  label: group.label,
  value: group.id,
}))

interface CollectionIconComboboxGroup {
  items: readonly CollectionIconOption[]
  label: string
  value: string
}

export function CollectionIconPicker({
  color,
  onSelect,
  selectedIcon,
}: {
  color: AppearanceColor
  onSelect: (icon: CollectionIconName) => void
  selectedIcon: CollectionIconName
}): React.ReactElement {
  const selectedOption =
    collectionIconOptions.find((option) => option.icon === selectedIcon) ??
    collectionIconOptions[0]

  return (
    <Combobox
      autoHighlight
      filter={(option: CollectionIconOption, query) => {
        const normalizedQuery = query.trim().toLocaleLowerCase()
        return [option.label, ...option.aliases].some((term) =>
          term.toLocaleLowerCase().includes(normalizedQuery)
        )
      }}
      isItemEqualToValue={(option, value) => option.icon === value.icon}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.icon}
      items={collectionIconComboboxGroups}
      onValueChange={(option: CollectionIconOption | null) => {
        if (option) onSelect(option.icon)
      }}
      value={selectedOption}
    >
      <ComboboxInput
        aria-label="Collection icon"
        autoComplete="off"
        id="collection-icon"
        placeholder="Search icons…"
        startAddon={
          <CollectionIcon
            className="size-4.5"
            color={color}
            icon={selectedIcon}
          />
        }
      />
      <ComboboxPopup className="w-(--anchor-width)">
        <ComboboxEmpty>No icons found.</ComboboxEmpty>
        <ComboboxList>
          {(group: CollectionIconComboboxGroup) => (
            <Fragment key={group.value}>
              <ComboboxGroup items={group.items}>
                <ComboboxGroupLabel>{group.label}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(option: CollectionIconOption) => (
                    <ComboboxItem key={option.icon} value={option}>
                      <span className="flex items-center gap-2">
                        <CollectionIcon
                          className="size-4.5"
                          color={color}
                          icon={option.icon}
                        />
                        <span>{option.label}</span>
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
              {group.value !== collectionIconComboboxGroups.at(-1)?.value ? (
                <ComboboxSeparator />
              ) : null}
            </Fragment>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  )
}

export default CollectionIconPicker
