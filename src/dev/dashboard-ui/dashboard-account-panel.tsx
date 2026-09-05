import { WarningIcon } from "@phosphor-icons/react"
import * as React from "react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { DashboardAccountState } from "@/dev/dashboard-ui/dashboard-account-state"

function AccountDeletionDialog({
  account,
}: {
  account: DashboardAccountState
}): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<"warning" | "confirm">("warning")
  const [confirmation, setConfirmation] = React.useState("")
  const focusConfirmationInput = React.useCallback(
    (input: HTMLInputElement | null): void => input?.focus(),
    []
  )
  const pending = account.deletion.status === "pending"
  const confirmationMatches = confirmation === "delete"

  const close = (): void => {
    setOpen(false)
    setStep("warning")
    setConfirmation("")
  }

  return (
    <AlertDialog
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && pending) {
          eventDetails.cancel()
          return
        }
        setOpen(nextOpen)
        if (!nextOpen) {
          setStep("warning")
          setConfirmation("")
        }
      }}
      open={open}
    >
      <Button
        onClick={() => setOpen(true)}
        type="button"
        variant="destructive-outline"
      >
        Delete account
      </Button>
      <AlertDialogPopup>
        {step === "warning" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes every bookmark, collection, tag, and
                profile record. There is no grace period or Undo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose
                render={<Button type="button" variant="ghost" />}
              >
                Cancel
              </AlertDialogClose>
              <Button
                onClick={() => setStep("confirm")}
                type="button"
                variant="destructive"
              >
                Continue
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Type delete to continue</AlertDialogTitle>
              <AlertDialogDescription>
                This is the final confirmation. The production action will also
                end the signed-in session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 pb-6">
              <Field invalid={account.deletion.status === "error"}>
                <FieldLabel htmlFor="delete-account-confirmation">
                  Confirmation
                </FieldLabel>
                <Input
                  aria-describedby={
                    account.deletion.status === "error"
                      ? "delete-account-error"
                      : "delete-account-help"
                  }
                  aria-invalid={account.deletion.status === "error"}
                  autoComplete="off"
                  disabled={pending}
                  id="delete-account-confirmation"
                  onChange={(event) => setConfirmation(event.target.value)}
                  ref={focusConfirmationInput}
                  spellCheck={false}
                  type="text"
                  value={confirmation}
                />
                <span
                  className="text-xs text-muted-foreground"
                  id="delete-account-help"
                >
                  Enter the exact lowercase word delete.
                </span>
                {account.deletion.status === "error" &&
                account.deletion.message ? (
                  <FieldError id="delete-account-error" match>
                    {account.deletion.message}
                  </FieldError>
                ) : null}
              </Field>
            </div>
            <AlertDialogFooter>
              <Button
                disabled={pending}
                onClick={() => setStep("warning")}
                type="button"
                variant="ghost"
              >
                Back
              </Button>
              <Button
                disabled={!confirmationMatches}
                loading={pending}
                onClick={async () => {
                  const deleted = await account.actions.deleteAccount()
                  if (deleted) close()
                }}
                type="button"
                variant="destructive"
              >
                Delete account
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogPopup>
    </AlertDialog>
  )
}

export function DashboardAccountPanel({
  account,
}: {
  account: DashboardAccountState
}): React.ReactElement {
  if (account.deletion.status === "success") {
    return (
      <div className="grid gap-6">
        <div>
          <h2
            className="font-heading text-xl font-semibold text-balance"
            id="account-settings-title"
          >
            Account
          </h2>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            Review the result of the local deletion demo.
          </p>
        </div>
        <Alert variant="success">
          <AlertTitle>Deletion demo complete</AlertTitle>
          <AlertDescription>{account.deletion.message}</AlertDescription>
          <AlertAction>
            <Button
              onClick={account.actions.acknowledgeDeletion}
              size="sm"
              type="button"
            >
              Reset demo
            </Button>
          </AlertAction>
        </Alert>
      </div>
    )
  }

  return (
    <div className="grid gap-8">
      <div>
        <h2
          className="font-heading text-xl font-semibold text-balance"
          id="account-settings-title"
        >
          Account
        </h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          This mock shows account identity without connecting authentication.
        </p>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Email</p>
        <p className="text-sm text-muted-foreground">
          {account.profile.saved.email}
        </p>
      </div>

      <div className="grid gap-4 border-t border-border pt-6">
        <div className="flex gap-3">
          <WarningIcon className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <h3 className="font-medium text-destructive-foreground">
              Danger zone
            </h3>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              Account deletion permanently removes the full library. The mock
              stops before changing any account or session.
            </p>
          </div>
        </div>
        <div>
          <AccountDeletionDialog account={account} />
        </div>
      </div>
    </div>
  )
}
