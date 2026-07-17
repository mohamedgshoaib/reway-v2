import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import type * as React from "react"

import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from "@/components/ui/autocomplete"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckboxGroup } from "@/components/ui/checkbox-group"
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Radio, RadioGroup } from "@/components/ui/radio-group"
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider, SliderValue } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { AuditGroup, AuditSection } from "@/dev/ui-audit/section-shell"

const sortItems = [
  { label: "Date added", value: "date" },
  { label: "Most visited", value: "visits" },
  { label: "Alphabetical", value: "alpha" },
  { label: "Custom order", value: "custom" },
] as const

const collectionItems = [
  { label: "Research", value: "research" },
  { label: "Reading list", value: "reading-list" },
  { label: "Design references", value: "design" },
  { label: "Uncollected", value: "uncollected" },
]

const tagItems = [
  { label: "engineering", value: "engineering" },
  { label: "design", value: "design" },
  { label: "product", value: "product" },
  { label: "reading", value: "reading" },
]

export function FormsSelectionSection(): React.ReactElement {
  return (
    <AuditSection
      description="checkbox, checkbox-group, radio-group, switch, slider, select, combobox, autocomplete."
      id="forms-selection"
      title="Forms — selection"
    >
      <AuditGroup label="Checkbox — states">
        <Label>
          <Checkbox defaultChecked />
          Checked
        </Label>
        <Label>
          <Checkbox />
          Unchecked
        </Label>
        <Label>
          <Checkbox indeterminate />
          Indeterminate
        </Label>
        <Label>
          <Checkbox disabled />
          Disabled
        </Label>
        <Label>
          <Checkbox aria-invalid />
          Invalid
        </Label>
      </AuditGroup>

      <AuditGroup label="Checkbox group" wrap={false}>
        <CheckboxGroup
          aria-label="Notification channels"
          defaultValue={["email"]}
        >
          <Label>
            <Checkbox value="email" />
            Email
          </Label>
          <Label>
            <Checkbox value="push" />
            Push
          </Label>
          <Label>
            <Checkbox value="sms" />
            SMS
          </Label>
        </CheckboxGroup>
      </AuditGroup>

      <AuditGroup label="Radio group" wrap={false}>
        <RadioGroup aria-label="Default view" defaultValue="list">
          <Label>
            <Radio value="list" /> List
          </Label>
          <Label>
            <Radio value="grid" /> Grid without image
          </Label>
          <Label>
            <Radio value="grid-image" /> Grid with image
          </Label>
        </RadioGroup>
      </AuditGroup>

      <AuditGroup label="Switch — states">
        <Label>
          <Switch defaultChecked />
          On
        </Label>
        <Label>
          <Switch />
          Off
        </Label>
        <Label>
          <Switch disabled />
          Disabled
        </Label>
      </AuditGroup>

      <AuditGroup label="Slider — single & range" wrap={false}>
        <Slider
          aria-label="Volume"
          className="w-64"
          defaultValue={40}
          max={100}
          min={0}
        >
          <div className="mb-2 flex justify-between text-sm">
            <Label>Volume</Label>
            <SliderValue />
          </div>
        </Slider>
        <div className="w-64">
          <Slider
            aria-label="Price range"
            defaultValue={[20, 80]}
            max={100}
            min={0}
          />
        </div>
      </AuditGroup>

      <AuditGroup label="Select — size" wrap={false}>
        <Select items={sortItems}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectPopup>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select defaultValue={sortItems[0]} items={sortItems}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectPopup>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select items={sortItems}>
          <SelectTrigger size="lg">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectPopup>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </AuditGroup>

      <AuditGroup label="Select — grouped, disabled option" wrap={false}>
        <Select items={collectionItems}>
          <SelectTrigger>
            <SelectValue placeholder="Move to collection" />
          </SelectTrigger>
          <SelectPopup>
            <SelectGroup>
              <SelectGroupLabel>Collections</SelectGroupLabel>
              {collectionItems.slice(0, 3).map((item) => (
                <SelectItem key={item.value} value={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectItem disabled value={collectionItems[3]!}>
              {collectionItems[3]!.label}
            </SelectItem>
          </SelectPopup>
        </Select>
      </AuditGroup>

      <AuditGroup label="Combobox — with clear" wrap={false}>
        <Combobox items={tagItems}>
          <ComboboxInput
            aria-label="Search tags"
            placeholder="Search tags…"
            showClear
          />
          <ComboboxPopup>
            <ComboboxEmpty>No tags found.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof tagItems)[number]) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
      </AuditGroup>

      <AuditGroup
        label="Autocomplete — icon addon, trigger, clear"
        wrap={false}
      >
        <Autocomplete items={collectionItems}>
          <AutocompleteInput
            aria-label="Search collections"
            placeholder="Search collections…"
            showClear
            showTrigger
            startAddon={<MagnifyingGlassIcon aria-hidden="true" />}
          />
          <AutocompletePopup>
            <AutocompleteEmpty>No collections found.</AutocompleteEmpty>
            <AutocompleteList>
              {(item: (typeof collectionItems)[number]) => (
                <AutocompleteItem key={item.value} value={item}>
                  {item.label}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        </Autocomplete>
      </AuditGroup>
    </AuditSection>
  )
}
