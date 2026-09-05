import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  getAvatarFileError,
  getDashboardAvatarPresentation,
  getDashboardUsernameError,
  readDashboardAvatarFile,
  type DashboardAvatarUpload,
  type DashboardProfile,
} from "@/dev/dashboard-ui/dashboard-account"

export function DashboardProfileFields({
  idPrefix,
  onAvatarChange,
  onAvatarRemove,
  onUsernameChange,
  profile,
  showUsernameError,
  usernameInputRef,
}: {
  idPrefix: string
  onAvatarChange: (upload: DashboardAvatarUpload) => void
  onAvatarRemove: () => void
  onUsernameChange: (username: string) => void
  profile: DashboardProfile
  showUsernameError: boolean
  usernameInputRef?: React.Ref<HTMLInputElement>
}): React.ReactElement {
  const [avatarError, setAvatarError] = React.useState<string | null>(null)
  const avatar = getDashboardAvatarPresentation(profile)
  const usernameError = getDashboardUsernameError(profile.username)
  const usernameInputId = `${idPrefix}-username`
  const usernameErrorId = `${idPrefix}-username-error`
  const avatarInputId = `${idPrefix}-avatar`
  const avatarErrorId = `${idPrefix}-avatar-error`

  const handleAvatarFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = getAvatarFileError(file)
    if (validationError) {
      setAvatarError(validationError)
      event.target.value = ""
      return
    }

    try {
      const upload = await readDashboardAvatarFile(file)
      setAvatarError(null)
      onAvatarChange(upload)
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : "Could not read this image."
      )
    } finally {
      event.target.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-18 ring-1 ring-border">
          <AvatarImage alt={avatar.alt} src={avatar.url} />
          <AvatarFallback>MH</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{avatar.sourceLabel}</p>
          <p className="mt-1 text-xs text-pretty text-muted-foreground">
            {profile.upload?.fileName ??
              (avatar.kind === "google"
                ? "Imported from the Google profile fixture."
                : "Assigned by the generated-avatar fixture.")}
          </p>
          {avatar.restoreLabel ? (
            <Button
              className="mt-2"
              onClick={() => {
                setAvatarError(null)
                onAvatarRemove()
              }}
              size="xs"
              type="button"
              variant="ghost"
            >
              {avatar.restoreLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <Field invalid={showUsernameError && Boolean(usernameError)}>
        <FieldLabel htmlFor={usernameInputId}>Username</FieldLabel>
        <Input
          aria-describedby={
            showUsernameError && usernameError ? usernameErrorId : undefined
          }
          aria-invalid={showUsernameError && Boolean(usernameError)}
          autoComplete="username"
          id={usernameInputId}
          name="username"
          onChange={(event) => onUsernameChange(event.target.value)}
          ref={usernameInputRef}
          type="text"
          value={profile.username}
        />
        <FieldDescription>
          1 to 40 characters. Unicode names are supported.
        </FieldDescription>
        {showUsernameError && usernameError ? (
          <FieldError id={usernameErrorId} match>
            {usernameError}
          </FieldError>
        ) : null}
      </Field>

      <Field invalid={Boolean(avatarError)}>
        <FieldLabel htmlFor={avatarInputId}>
          {profile.upload ? "Choose another avatar" : "Upload an avatar"}
        </FieldLabel>
        <Input
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={avatarError ? avatarErrorId : undefined}
          aria-invalid={Boolean(avatarError)}
          id={avatarInputId}
          name="avatar"
          onChange={(event) => void handleAvatarFile(event)}
          type="file"
        />
        <FieldDescription>JPEG, PNG, or WebP. Up to 2 MB.</FieldDescription>
        {avatarError ? (
          <FieldError id={avatarErrorId} match>
            {avatarError}
          </FieldError>
        ) : null}
      </Field>
    </div>
  )
}
