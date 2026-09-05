import { FlaskIcon } from "@phosphor-icons/react"
import * as React from "react"

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset"
import { Label } from "@/components/ui/label"
import { Radio, RadioGroup } from "@/components/ui/radio-group"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  DashboardFixtureOutcome,
  DashboardProfileFixture,
} from "@/dev/dashboard-ui/dashboard-account"
import type { DashboardAccountState } from "@/dev/dashboard-ui/dashboard-account-state"
import type {
  XArchiveFixture,
  XImportOutcome,
  XImportSpeed,
} from "@/dev/dashboard-ui/dashboard-x-import"
import type { DashboardXImportState } from "@/dev/dashboard-ui/dashboard-x-import-state"

const ARCHIVE_FIXTURE_OPTIONS = [
  { label: "Valid archive", value: "valid" },
  { label: "Empty archive", value: "empty" },
  { label: "Malformed archive", value: "malformed" },
  { label: "Mixed records", value: "mixed" },
  { label: "Repeated posts", value: "duplicates" },
] as const satisfies ReadonlyArray<{ label: string; value: XArchiveFixture }>

const IMPORT_OUTCOME_OPTIONS = [
  { label: "All succeed", value: "success" },
  { label: "Some fail", value: "partial" },
  { label: "All fail", value: "failure" },
] as const satisfies ReadonlyArray<{ label: string; value: XImportOutcome }>

const IMPORT_SPEED_OPTIONS = [
  { label: "Fast", value: "fast" },
  { label: "Slow", value: "slow" },
] as const satisfies ReadonlyArray<{ label: string; value: XImportSpeed }>

type DemoResetRequest =
  | { kind: "profile"; fixture: DashboardProfileFixture }
  | { kind: "reset" }

function DemoChoice({
  description,
  label,
  value,
}: {
  description: string
  label: string
  value: string
}): React.ReactElement {
  return (
    <Label className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50">
      <Radio className="mt-0.5" value={value} />
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-pretty text-muted-foreground">
          {description}
        </span>
      </span>
    </Label>
  )
}

export function DashboardDemoPanel({
  account,
  importState,
  onResetDemo,
}: {
  account: DashboardAccountState
  importState: DashboardXImportState
  onResetDemo: () => void
}): React.ReactElement {
  const [resetRequest, setResetRequest] =
    React.useState<DemoResetRequest | null>(null)
  const pending =
    account.profile.status === "pending" ||
    account.onboarding.status === "pending" ||
    account.deletion.status === "pending" ||
    importState.flow.stage === "importing"

  const applyResetRequest = (request: DemoResetRequest): void => {
    if (request.kind === "profile") {
      account.actions.setProfileFixture(request.fixture)
    } else {
      onResetDemo()
    }
  }

  const requestReset = (request: DemoResetRequest): void => {
    if (account.profile.dirty) {
      setResetRequest(request)
      return
    }
    applyResetRequest(request)
  }

  return (
    <div className="grid gap-7">
      <div>
        <div className="flex items-center gap-2">
          <h2
            className="font-heading text-xl font-semibold text-balance"
            id="demo-settings-title"
          >
            Demo
          </h2>
          <Badge>Mock only</Badge>
        </div>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Reach each account state without connecting authentication or storage.
        </p>
      </div>

      <Fieldset className="grid gap-3" disabled={pending}>
        <FieldsetLegend className="text-sm font-medium">
          Profile fixture
        </FieldsetLegend>
        <RadioGroup
          onValueChange={(value) =>
            requestReset({
              fixture: value as DashboardProfileFixture,
              kind: "profile",
            })
          }
          value={account.demo.profileFixture}
        >
          <DemoChoice
            description="Email-prefix username and a generated avatar."
            label="Email defaults"
            value="email"
          />
          <DemoChoice
            description="Google first name and the retained Google avatar."
            label="Google defaults"
            value="google"
          />
        </RadioGroup>
      </Fieldset>

      <div className="grid gap-5 min-[520px]:grid-cols-2">
        <FixtureOutcomeField
          disabled={pending}
          label="Next profile save"
          onValueChange={account.actions.setNextProfileOutcome}
          value={account.demo.nextProfileOutcome}
        />
        <FixtureOutcomeField
          disabled={pending}
          label="Next account deletion"
          onValueChange={account.actions.setNextDeletionOutcome}
          value={account.demo.nextDeletionOutcome}
        />
      </div>

      <div className="grid gap-4 border-t border-border pt-6">
        <div>
          <h3 className="text-sm font-medium">X import fixtures</h3>
          <p className="mt-1 text-xs text-pretty text-muted-foreground">
            Choose the archive, result, and speed used by the Import page.
          </p>
        </div>
        <div className="grid gap-4 min-[520px]:grid-cols-2">
          <ImportFixtureField
            disabled={pending}
            label="Archive contents"
            onValueChange={importState.actions.setArchiveFixture}
            options={ARCHIVE_FIXTURE_OPTIONS}
            value={importState.demo.archiveFixture}
          />
          <ImportFixtureField
            disabled={pending}
            label="Import speed"
            onValueChange={importState.actions.setSpeed}
            options={IMPORT_SPEED_OPTIONS}
            value={importState.demo.speed}
          />
          <ImportFixtureField
            disabled={pending}
            label="Initial result"
            onValueChange={importState.actions.setInitialOutcome}
            options={IMPORT_OUTCOME_OPTIONS}
            value={importState.demo.initialOutcome}
          />
          <ImportFixtureField
            disabled={pending}
            label="Retry result"
            onValueChange={importState.actions.setRetryOutcome}
            options={IMPORT_OUTCOME_OPTIONS}
            value={importState.demo.retryOutcome}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
        <Button
          disabled={pending}
          onClick={account.actions.openOnboarding}
          type="button"
          variant="outline"
        >
          <FlaskIcon />
          Preview profile setup
        </Button>
        <Button
          disabled={pending}
          onClick={() => requestReset({ kind: "reset" })}
          type="button"
          variant="ghost"
        >
          Reset demo
        </Button>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setResetRequest(null)
        }}
        open={resetRequest !== null}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace profile changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This fixture change will discard the username and avatar draft in
              Profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="ghost" />}>
              Keep editing
            </AlertDialogClose>
            <Button
              onClick={() => {
                if (resetRequest) applyResetRequest(resetRequest)
                setResetRequest(null)
              }}
              type="button"
            >
              Discard and continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  )
}

function ImportFixtureField<Value extends string>({
  disabled,
  label,
  onValueChange,
  options,
  value,
}: {
  disabled: boolean
  label: string
  onValueChange: (value: Value) => void
  options: ReadonlyArray<{ label: string; value: Value }>
  value: Value
}): React.ReactElement {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        disabled={disabled}
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(nextValue.value)
        }}
        value={options.find((option) => option.value === value) ?? null}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  )
}

function FixtureOutcomeField({
  disabled,
  label,
  onValueChange,
  value,
}: {
  disabled: boolean
  label: string
  onValueChange: (value: DashboardFixtureOutcome) => void
  value: DashboardFixtureOutcome
}): React.ReactElement {
  return (
    <Fieldset className="grid gap-3" disabled={disabled}>
      <FieldsetLegend className="text-sm font-medium">{label}</FieldsetLegend>
      <RadioGroup
        className="gap-2"
        onValueChange={(nextValue) =>
          onValueChange(nextValue as DashboardFixtureOutcome)
        }
        value={value}
      >
        <Label className="flex items-center gap-2 text-sm pointer-coarse:min-h-11">
          <Radio value="success" />
          Succeed
        </Label>
        <Label className="flex items-center gap-2 text-sm pointer-coarse:min-h-11">
          <Radio value="failure" />
          Fail once
        </Label>
      </RadioGroup>
    </Fieldset>
  )
}
