import {
  ArrowUpIcon,
  EnvelopeSimpleIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react"
import type * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "@/components/ui/number-field"
import {
  OTPField,
  OTPFieldInput,
  OTPFieldSeparator,
} from "@/components/ui/otp-field"
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { AuditGroup, AuditSection } from "@/dev/ui-audit/section-shell"

function BasicTextControls(): React.ReactElement {
  return (
    <>
      <AuditGroup label="Label">
        <Label htmlFor="audit-plain-input">Plain label</Label>
      </AuditGroup>

      <AuditGroup label="Input — size" wrap={false}>
        <Input id="audit-plain-input" placeholder="Default" size="default" />
        <Input aria-label="Small input" placeholder="Small" size="sm" />
        <Input aria-label="Large input" placeholder="Large" size="lg" />
      </AuditGroup>

      <AuditGroup label="Input — type & state" wrap={false}>
        <Input aria-label="Email" placeholder="you@example.com" type="email" />
        <Input aria-label="Password" placeholder="Password" type="password" />
        <Input aria-label="Disabled input" placeholder="Disabled" disabled />
        <Input
          aria-label="Invalid input"
          aria-invalid
          defaultValue="not-a-valid-value"
          placeholder="Invalid"
        />
        <Input aria-label="Choose file" type="file" />
      </AuditGroup>

      <AuditGroup label="Textarea — size" wrap={false}>
        <Textarea
          aria-label="Default textarea"
          placeholder="Default"
          size="default"
        />
        <Textarea aria-label="Small textarea" placeholder="Small" size="sm" />
        <Textarea aria-label="Large textarea" placeholder="Large" size="lg" />
      </AuditGroup>
    </>
  )
}

function BasicInputGroups(): React.ReactElement {
  return (
    <>
      <AuditGroup label="Input group — icon addon" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Search"
            placeholder="Search bookmarks…"
            type="search"
          />
          <InputGroupAddon>
            <EnvelopeSimpleIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — text prefix" wrap={false}>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Website address"
            placeholder="reway.page"
          />
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — interactive addon" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Website address"
            defaultValue="https://example.com"
          />
          <InputGroupAddon align="inline-end">
            <Button aria-label="Clear" size="icon-xs" variant="ghost">
              <XIcon aria-hidden="true" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — end text" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Choose a username"
            placeholder="Choose a username"
            type="text"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>@coss.com</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — start and end text" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Enter your domain"
            className="*:[input]:px-0!"
            placeholder="coss"
            type="text"
          />
          <InputGroupAddon>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <InputGroupText>.com</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — with badge" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Search bookmarks"
            placeholder="Type to search…"
            type="search"
          />
          <InputGroupAddon align="inline-end">
            <Badge variant="info">Badge</Badge>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — with keyboard shortcut" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Search bookmarks"
            placeholder="Search…"
            type="search"
          />
          <InputGroupAddon align="inline-end">
            <Kbd>⌘K</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>
    </>
  )
}

function RichInputGroups(): React.ReactElement {
  return (
    <>
      <AuditGroup label="Input group — with inner label" wrap={false}>
        <InputGroup>
          <InputGroupInput
            id="audit-inner-label-email"
            placeholder="team@coss.com"
            type="email"
          />
          <InputGroupAddon align="block-start">
            <Label
              className="text-foreground"
              htmlFor="audit-inner-label-email"
            >
              Email
            </Label>
            <Popover>
              <PopoverTrigger
                className="ml-auto"
                openOnHover
                render={
                  <Button
                    aria-label="About email notifications"
                    className="-m-1"
                    size="icon-xs"
                    variant="ghost"
                  />
                }
              >
                <InfoIcon aria-hidden="true" />
              </PopoverTrigger>
              <PopoverPopup side="top" tooltipStyle>
                <p>We&apos;ll use this to send you notifications</p>
              </PopoverPopup>
            </Popover>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — with tooltip" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Password"
            placeholder="Password"
            type="password"
          />
          <InputGroupAddon align="inline-end">
            <Popover>
              <PopoverTrigger
                openOnHover
                render={
                  <Button
                    aria-label="Password requirements"
                    size="icon-xs"
                    variant="ghost"
                  />
                }
              >
                <InfoIcon aria-hidden="true" />
              </PopoverTrigger>
              <PopoverPopup side="top" tooltipStyle>
                <p>Min. 8 characters</p>
              </PopoverPopup>
            </Popover>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — small & large size" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Search"
            placeholder="Search"
            size="sm"
            type="search"
          />
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput
            aria-label="Search"
            placeholder="Search"
            size="lg"
            type="search"
          />
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — loading" wrap={false}>
        <InputGroup>
          <InputGroupInput
            aria-label="Search bookmarks"
            disabled
            placeholder="Searching…"
            type="search"
          />
          <InputGroupAddon align="inline-end">
            <Spinner />
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>
    </>
  )
}

function SpecializedInputGroups(): React.ReactElement {
  return (
    <>
      <AuditGroup label="Input group — with number field" wrap={false}>
        <InputGroup>
          <NumberField aria-label="Enter the amount" defaultValue={10}>
            <NumberFieldInput className="text-left" />
          </NumberField>
          <InputGroupAddon>
            <InputGroupText>€</InputGroupText>
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <InputGroupText>EUR</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>

      <AuditGroup label="Input group — with textarea" wrap={false}>
        <InputGroup>
          <InputGroupTextarea
            aria-label="Bookmark note"
            placeholder="Add a note…"
          />
          <InputGroupAddon align="block-end">
            <Menu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <MenuTrigger
                      render={
                        <Button
                          aria-label="Add bookmark details"
                          className="rounded-full"
                          size="icon-sm"
                          variant="ghost"
                        />
                      }
                    >
                      <PlusIcon aria-hidden="true" />
                    </MenuTrigger>
                  }
                />
                <TooltipPopup>Add bookmark details</TooltipPopup>
              </Tooltip>
              <MenuPopup align="start">
                <MenuItem>Add tags</MenuItem>
                <MenuItem>Add to collection</MenuItem>
                <MenuItem>Add note</MenuItem>
              </MenuPopup>
            </Menu>
            <InputGroupText className="ml-auto tabular-nums">
              120 characters left
            </InputGroupText>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="Save note"
                    className="rounded-full"
                    size="icon-sm"
                    variant="default"
                  >
                    <ArrowUpIcon aria-hidden="true" />
                  </Button>
                }
              />
              <TooltipPopup>Save note</TooltipPopup>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </AuditGroup>
    </>
  )
}

function NumberAndOtpFields(): React.ReactElement {
  return (
    <>
      <AuditGroup label="Number field — sizes">
        <NumberField
          aria-label="Small quantity"
          defaultValue={1}
          max={99}
          min={0}
          size="sm"
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
        <NumberField aria-label="Quantity" defaultValue={1} max={99} min={0}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
        <NumberField
          aria-label="Large quantity"
          defaultValue={1}
          max={99}
          min={0}
          size="lg"
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </AuditGroup>

      <AuditGroup label="Number field — scrub area" wrap={false}>
        <NumberField aria-label="Brightness" defaultValue={50}>
          <NumberFieldScrubArea label="Brightness" />
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </AuditGroup>

      <AuditGroup label="OTP field" wrap={false}>
        <OTPField aria-label="Verification code" length={6}>
          <OTPFieldInput aria-label="Character 1 of 6" />
          <OTPFieldInput aria-label="Character 2 of 6" />
          <OTPFieldInput aria-label="Character 3 of 6" />
          <OTPFieldSeparator />
          <OTPFieldInput aria-label="Character 4 of 6" />
          <OTPFieldInput aria-label="Character 5 of 6" />
          <OTPFieldInput aria-label="Character 6 of 6" />
        </OTPField>
      </AuditGroup>
    </>
  )
}

function FormCompositions(): React.ReactElement {
  return (
    <>
      <AuditGroup label="Field — labeled, described, invalid" wrap={false}>
        <Field name="audit-collection-name">
          <FieldLabel>Collection name</FieldLabel>
          <Input placeholder="Research" />
          <FieldDescription>Shown in the sidebar and search.</FieldDescription>
        </Field>
        <Field data-invalid name="audit-collection-name-invalid">
          <FieldLabel>Collection name</FieldLabel>
          <Input aria-invalid defaultValue="" placeholder="Research" />
          <FieldError>A collection name is required.</FieldError>
        </Field>
      </AuditGroup>

      <AuditGroup label="Fieldset — grouped fields" wrap={false}>
        <Fieldset className="flex w-full flex-col gap-4 rounded-lg border p-4">
          <FieldsetLegend>Profile</FieldsetLegend>
          <Field name="audit-username">
            <FieldLabel>Username</FieldLabel>
            <Input placeholder="reader" />
          </Field>
          <Field name="audit-bio">
            <FieldLabel>Bio</FieldLabel>
            <Textarea placeholder="A short bio" size="sm" />
          </Field>
        </Fieldset>
      </AuditGroup>

      <AuditGroup label="Form — submit flow" wrap={false}>
        <Form
          className="flex w-full max-w-sm flex-col gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <Field name="email">
            <FieldLabel>Email</FieldLabel>
            <Input required type="email" />
            <FieldDescription>Used for account updates.</FieldDescription>
            <FieldError>Please enter a valid email.</FieldError>
          </Field>
          <Button className="self-start" type="submit">
            Submit
          </Button>
        </Form>
      </AuditGroup>
    </>
  )
}

export function FormsTextSection(): React.ReactElement {
  return (
    <AuditSection
      description="label, input, textarea, input-group, number-field, otp-field, field, fieldset, form."
      id="forms-text"
      title="Forms — text"
    >
      <BasicTextControls />
      <BasicInputGroups />
      <RichInputGroups />
      <SpecializedInputGroups />
      <NumberAndOtpFields />
      <FormCompositions />
    </AuditSection>
  )
}
