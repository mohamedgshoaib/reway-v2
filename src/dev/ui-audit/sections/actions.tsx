import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  HeartIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import * as React from "react"

import { AnimatedIcon } from "@/components/ui/animated-icon"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AuditGroup, AuditSection } from "@/dev/ui-audit/section-shell"

function CopyButtonDemo(): React.ReactElement {
  const [copied, setCopied] = React.useState(false)

  return (
    <Button
      aria-label={copied ? "Copied" : "Copy link"}
      onClick={() => {
        void navigator.clipboard?.writeText("https://reway.page/library")
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      size="icon"
      variant="outline"
    >
      <AnimatedIcon transitionKey={copied ? "check" : "copy"}>
        {copied ? (
          <CheckIcon aria-hidden="true" />
        ) : (
          <CopyIcon aria-hidden="true" />
        )}
      </AnimatedIcon>
    </Button>
  )
}

const buttonVariantNames = [
  "default",
  "destructive",
  "destructive-outline",
  "ghost",
  "link",
  "outline",
  "secondary",
] as const satisfies ReadonlyArray<NonNullable<ButtonProps["variant"]>>

const buttonSizeNames = [
  "xs",
  "sm",
  "default",
  "lg",
  "xl",
] as const satisfies ReadonlyArray<NonNullable<ButtonProps["size"]>>

const iconButtonSizeNames = [
  "icon-xs",
  "icon-sm",
  "icon",
  "icon-lg",
  "icon-xl",
] as const satisfies ReadonlyArray<NonNullable<ButtonProps["size"]>>

const badgeVariantNames = [
  "default",
  "destructive",
  "error",
  "info",
  "outline",
  "secondary",
  "success",
  "warning",
] as const satisfies ReadonlyArray<NonNullable<BadgeProps["variant"]>>

const badgeSizeNames = ["sm", "default", "lg"] as const satisfies ReadonlyArray<
  NonNullable<BadgeProps["size"]>
>

export function ActionsSection(): React.ReactElement {
  return (
    <AuditSection
      description="button, toggle, toggle-group, badge, kbd, separator."
      id="actions"
      title="Actions"
    >
      <AuditGroup label="Button — variant">
        {buttonVariantNames.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </AuditGroup>

      <AuditGroup label="Button — size">
        {buttonSizeNames.map((size) => (
          <Button key={size} size={size}>
            Size {size}
          </Button>
        ))}
      </AuditGroup>

      <AuditGroup label="Button — icon size">
        {iconButtonSizeNames.map((size) => (
          <Button aria-label={`Favorite (${size})`} key={size} size={size}>
            <HeartIcon />
          </Button>
        ))}
      </AuditGroup>

      <AuditGroup label="Button — state">
        <Button>
          Default <ArrowRightIcon />
        </Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button loading variant="outline">
          Loading outline
        </Button>
      </AuditGroup>

      <AuditGroup label="Button — copy, animated icon transition">
        <CopyButtonDemo />
      </AuditGroup>

      <AuditGroup label="Toggle — variant / size">
        <Toggle aria-label="Bold" defaultPressed size="sm">
          B
        </Toggle>
        <Toggle aria-label="Italic" defaultPressed>
          I
        </Toggle>
        <Toggle aria-label="Underline" size="lg">
          U
        </Toggle>
        <Toggle aria-label="Strikethrough" variant="outline">
          S
        </Toggle>
        <Toggle aria-label="Disabled toggle" disabled>
          D
        </Toggle>
      </AuditGroup>

      <AuditGroup label="Toggle group — default variant">
        <ToggleGroup aria-label="Text alignment" defaultValue={["left"]}>
          <ToggleGroupItem aria-label="Align left" value="left">
            L
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Align center" value="center">
            C
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Align right" value="right">
            R
          </ToggleGroupItem>
        </ToggleGroup>
      </AuditGroup>

      <AuditGroup label="Toggle group — outline variant, vertical">
        <ToggleGroup
          aria-label="View mode"
          defaultValue={["grid"]}
          orientation="vertical"
          variant="outline"
        >
          <ToggleGroupItem aria-label="List view" value="list">
            List
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Grid view" value="grid">
            Grid
          </ToggleGroupItem>
        </ToggleGroup>
      </AuditGroup>

      <AuditGroup label="Badge — variant">
        {badgeVariantNames.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </AuditGroup>

      <AuditGroup label="Badge — size">
        {badgeSizeNames.map((size) => (
          <Badge key={size} size={size}>
            {size}
          </Badge>
        ))}
      </AuditGroup>

      <AuditGroup label="Badge — as interactive element">
        <Badge
          render={<button aria-label="Remove tag" type="button" />}
          variant="destructive"
        >
          <TrashIcon /> Removable
        </Badge>
      </AuditGroup>

      <AuditGroup label="Kbd / KbdGroup">
        <Kbd>K</Kbd>
        <Kbd>Esc</Kbd>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>P</Kbd>
        </KbdGroup>
      </AuditGroup>

      <AuditGroup label="Separator — horizontal" wrap={false}>
        <div className="w-64">
          <p className="text-sm">Above</p>
          <Separator className="my-2" />
          <p className="text-sm">Below</p>
        </div>
      </AuditGroup>

      <AuditGroup label="Separator — vertical">
        <div className="flex h-8 items-center gap-3 text-sm">
          <span>Left</span>
          <Separator orientation="vertical" />
          <span>Right</span>
        </div>
      </AuditGroup>
    </AuditSection>
  )
}
