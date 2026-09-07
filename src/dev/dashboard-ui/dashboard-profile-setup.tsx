import { WarningCircleIcon } from "@phosphor-icons/react"
import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  areDashboardProfilesEqual,
  createDefaultDashboardProfile,
  getDashboardUsernameError,
} from "@/dev/dashboard-ui/dashboard-account"
import type { DashboardAccountState } from "@/dev/dashboard-ui/dashboard-account-state"
import { DashboardProfileFields } from "@/dev/dashboard-ui/dashboard-profile-editor"

export function DashboardProfileSetupDialog({
  account,
}: {
  account: DashboardAccountState
}): React.ReactElement {
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [useDefaultsOpen, setUseDefaultsOpen] = React.useState(false)
  const usernameInputRef = React.useRef<HTMLInputElement>(null)
  const defaultProfile = createDefaultDashboardProfile(
    account.demo.profileFixture
  )
  const dirty = !areDashboardProfilesEqual(
    account.onboarding.draft,
    defaultProfile
  )
  const pending = account.onboarding.status === "pending"
  const usernameError = getDashboardUsernameError(
    account.onboarding.draft.username
  )

  const requestSkip = (): void => {
    if (dirty) {
      setUseDefaultsOpen(true)
      return
    }
    setSubmitAttempted(false)
    account.actions.skipOnboarding()
  }

  return (
    <>
      <Dialog
        disablePointerDismissal={dirty || pending}
        onOpenChange={(open, eventDetails) => {
          if (open) {
            account.actions.setOnboardingOpen(true)
            return
          }
          if (pending) {
            eventDetails.cancel()
            return
          }
          eventDetails.cancel()
          requestSkip()
        }}
        open={account.onboarding.open}
      >
        <DialogPopup className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up your profile</DialogTitle>
          </DialogHeader>
          {/* react-doctor-disable-next-line react-doctor/no-prevent-default -- This mock-backed form owns local validation and has no server action. */}
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              setSubmitAttempted(true)
              if (usernameError) {
                usernameInputRef.current?.focus()
                return
              }
              void account.actions.finishOnboarding()
            }}
          >
            <DialogPanel className="grid gap-5">
              <p className="text-sm text-pretty text-muted-foreground">
                You can finish now or use the defaults and return later.
              </p>
              <DashboardProfileFields
                idPrefix="onboarding-profile"
                key={account.onboarding.draft.fixture}
                onAvatarChange={account.actions.setOnboardingAvatar}
                onAvatarRemove={account.actions.removeOnboardingAvatar}
                onUsernameChange={account.actions.setOnboardingUsername}
                profile={account.onboarding.draft}
                showUsernameError={submitAttempted}
                usernameInputRef={usernameInputRef}
              />
              {account.onboarding.status === "error" &&
              account.onboarding.message ? (
                <Alert variant="error">
                  <WarningCircleIcon />
                  <AlertTitle>Profile not saved</AlertTitle>
                  <AlertDescription>
                    {account.onboarding.message}
                  </AlertDescription>
                </Alert>
              ) : null}
            </DialogPanel>
            <DialogFooter>
              <Button
                disabled={pending}
                onClick={requestSkip}
                type="button"
                variant="ghost"
              >
                Skip for now
              </Button>
              <Button loading={pending} type="submit">
                Finish setup
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => setUseDefaultsOpen(open)}
        open={useDefaultsOpen}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Use the default profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Your username and avatar changes in this setup will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="ghost" />}>
              Keep editing
            </AlertDialogClose>
            <Button
              onClick={() => {
                setUseDefaultsOpen(false)
                setSubmitAttempted(false)
                account.actions.skipOnboarding()
              }}
              type="button"
            >
              Use defaults
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  )
}
