import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react"
import * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertStatus,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getDashboardUsernameError } from "@/dev/dashboard-ui/dashboard-account"
import type { DashboardAccountState } from "@/dev/dashboard-ui/dashboard-account-state"
import { DashboardProfileFields } from "@/dev/dashboard-ui/dashboard-profile-editor"

export function DashboardProfilePanel({
  account,
}: {
  account: DashboardAccountState
}): React.ReactElement {
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const usernameInputRef = React.useRef<HTMLInputElement>(null)
  const usernameError = getDashboardUsernameError(
    account.profile.draft.username
  )

  return (
    <div className="grid gap-6">
      <div>
        <h2
          className="font-heading text-xl font-semibold text-balance"
          id="profile-settings-title"
        >
          Profile
        </h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Choose how your profile appears across your library.
        </p>
      </div>

      {/* react-doctor-disable-next-line react-doctor/no-prevent-default -- This mock-backed form owns local validation and has no server action. */}
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitAttempted(true)
          if (usernameError) {
            usernameInputRef.current?.focus()
            return
          }
          void account.actions.saveProfile()
        }}
      >
        <DashboardProfileFields
          idPrefix="settings-profile"
          key={account.profile.draft.fixture}
          onAvatarChange={account.actions.setProfileAvatar}
          onAvatarRemove={account.actions.removeProfileAvatar}
          onUsernameChange={account.actions.setProfileUsername}
          profile={account.profile.draft}
          showUsernameError={submitAttempted}
          usernameInputRef={usernameInputRef}
        />

        {account.profile.status === "error" && account.profile.message ? (
          <Alert variant="error">
            <WarningCircleIcon />
            <AlertTitle>Profile not saved</AlertTitle>
            <AlertDescription>{account.profile.message}</AlertDescription>
          </Alert>
        ) : null}
        {account.profile.status === "success" && account.profile.message ? (
          <AlertStatus variant="success">
            <CheckCircleIcon />
            <AlertTitle>Profile saved</AlertTitle>
            <AlertDescription>{account.profile.message}</AlertDescription>
          </AlertStatus>
        ) : null}

        <div className="flex justify-end">
          <Button
            disabled={!account.profile.dirty}
            loading={account.profile.status === "pending"}
            type="submit"
          >
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}
