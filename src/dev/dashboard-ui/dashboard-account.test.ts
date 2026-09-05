import { describe, expect, it } from "vitest"

import {
  MAX_AVATAR_FILE_BYTES,
  areDashboardProfilesEqual,
  createDefaultDashboardProfile,
  getAvatarFileError,
  getDashboardAvatarPresentation,
  getDashboardUsernameError,
  normalizeDashboardUsername,
  withDashboardAvatarUpload,
  withoutDashboardAvatarUpload,
} from "@/dev/dashboard-ui/dashboard-account"

const uploadedAvatar = {
  dataUrl: "data:image/png;base64,dGVzdA==",
  fileName: "profile.png",
  mimeType: "image/png",
  size: 1024,
}

describe("dashboard account model", () => {
  it("derives email and Google profile defaults", () => {
    const emailProfile = createDefaultDashboardProfile("email")
    const googleProfile = createDefaultDashboardProfile("google")

    expect(emailProfile.username).toBe("mira.hassan")
    expect(getDashboardAvatarPresentation(emailProfile).kind).toBe("generated")
    expect(googleProfile.username).toBe("Mira")
    expect(getDashboardAvatarPresentation(googleProfile).kind).toBe("google")
  })

  it("accepts trimmed Unicode usernames up to 40 characters", () => {
    expect(normalizeDashboardUsername("  ميرا  ")).toBe("ميرا")
    expect(getDashboardUsernameError("ميرا")).toBeNull()
    expect(getDashboardUsernameError("é".repeat(40))).toBeNull()
    expect(getDashboardUsernameError("é".repeat(41))).toBe(
      "Use 40 characters or fewer."
    )
    expect(getDashboardUsernameError("   ")).toBe("Enter a username.")
  })

  it("validates avatar type and size before preview", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(
        getAvatarFileError({ size: MAX_AVATAR_FILE_BYTES, type })
      ).toBeNull()
    }

    expect(getAvatarFileError({ size: 12, type: "image/gif" })).toBe(
      "Choose a JPEG, PNG, or WebP image."
    )
    expect(
      getAvatarFileError({
        size: MAX_AVATAR_FILE_BYTES + 1,
        type: "image/png",
      })
    ).toBe("Choose an image no larger than 2 MB.")
  })

  it("restores the correct avatar under an uploaded draft", () => {
    const emailUpload = withDashboardAvatarUpload(
      createDefaultDashboardProfile("email"),
      uploadedAvatar
    )
    const googleUpload = withDashboardAvatarUpload(
      createDefaultDashboardProfile("google"),
      uploadedAvatar
    )

    expect(getDashboardAvatarPresentation(emailUpload).restoreLabel).toContain(
      "generated avatar"
    )
    expect(getDashboardAvatarPresentation(googleUpload).restoreLabel).toContain(
      "Google avatar"
    )
    expect(
      getDashboardAvatarPresentation(withoutDashboardAvatarUpload(emailUpload))
        .kind
    ).toBe("generated")
    expect(
      getDashboardAvatarPresentation(withoutDashboardAvatarUpload(googleUpload))
        .kind
    ).toBe("google")
  })

  it("compares every saved profile and upload field", () => {
    const profile = createDefaultDashboardProfile("email")
    expect(areDashboardProfilesEqual(profile, { ...profile })).toBe(true)
    expect(
      areDashboardProfilesEqual(profile, { ...profile, username: "Changed" })
    ).toBe(false)
    expect(
      areDashboardProfilesEqual(
        withDashboardAvatarUpload(profile, uploadedAvatar),
        withDashboardAvatarUpload(profile, {
          ...uploadedAvatar,
          fileName: "other.png",
        })
      )
    ).toBe(false)
  })
})
