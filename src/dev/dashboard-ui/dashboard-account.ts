export const MAX_AVATAR_FILE_BYTES = 2 * 1024 * 1024

export const ACCEPTED_AVATAR_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type DashboardProfileFixture = "email" | "google"
export type DashboardFixtureOutcome = "success" | "failure"
export type DashboardAvatarKind = "generated" | "google" | "uploaded"

export interface DashboardAvatarUpload {
  dataUrl: string
  fileName: string
  mimeType: string
  size: number
}

export interface DashboardProfile {
  email: string
  fixture: DashboardProfileFixture
  generatedAvatarUrl: string
  googleAvatarUrl?: string
  upload?: DashboardAvatarUpload
  username: string
}

export interface DashboardAvatarPresentation {
  alt: string
  kind: DashboardAvatarKind
  restoreLabel: string | null
  sourceLabel: string
  url: string
}

export type DashboardAccountMutation =
  | { kind: "delete-account" }
  | { kind: "save-profile"; profile: DashboardProfile }

export type DashboardAccountMutationAdapter = (
  mutation: DashboardAccountMutation
) => Promise<void>

const MOCK_EMAIL = "mira.hassan@example.com"
const MOCK_GOOGLE_FIRST_NAME = "Mira"

function createAvatarDataUrl({
  background,
  foreground,
  initials,
  ring,
}: {
  background: string
  foreground: string
  initials: string
  ring: string
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${background}"/><circle cx="48" cy="48" r="34" fill="none" stroke="${ring}" stroke-width="6"/><text x="48" y="57" fill="${foreground}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="28" font-weight="650" text-anchor="middle">${initials}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const GENERATED_AVATAR_URL = createAvatarDataUrl({
  background: "#e7e5e4",
  foreground: "#292524",
  initials: "MH",
  ring: "#a8a29e",
})

const GOOGLE_AVATAR_URL = createAvatarDataUrl({
  background: "#dbeafe",
  foreground: "#1e3a8a",
  initials: "M",
  ring: "#60a5fa",
})

export function getEmailPrefix(email: string): string {
  return email.split("@", 1)[0] ?? ""
}

export function createDefaultDashboardProfile(
  fixture: DashboardProfileFixture
): DashboardProfile {
  if (fixture === "google") {
    return {
      email: MOCK_EMAIL,
      fixture,
      generatedAvatarUrl: GENERATED_AVATAR_URL,
      googleAvatarUrl: GOOGLE_AVATAR_URL,
      username: MOCK_GOOGLE_FIRST_NAME || getEmailPrefix(MOCK_EMAIL),
    }
  }

  return {
    email: MOCK_EMAIL,
    fixture,
    generatedAvatarUrl: GENERATED_AVATAR_URL,
    username: getEmailPrefix(MOCK_EMAIL),
  }
}

export function normalizeDashboardUsername(username: string): string {
  return username.trim()
}

export function getDashboardUsernameError(username: string): string | null {
  const normalizedUsername = normalizeDashboardUsername(username)
  if (normalizedUsername.length === 0) return "Enter a username."

  let characterCount = 0
  for (const _codePoint of normalizedUsername) {
    characterCount += 1
    if (characterCount > 40) return "Use 40 characters or fewer."
  }
  return null
}

export function getAvatarFileError(
  file: Pick<File, "size" | "type">
): string | null {
  if (
    !ACCEPTED_AVATAR_FILE_TYPES.includes(
      file.type as (typeof ACCEPTED_AVATAR_FILE_TYPES)[number]
    )
  ) {
    return "Choose a JPEG, PNG, or WebP image."
  }

  if (file.size > MAX_AVATAR_FILE_BYTES) {
    return "Choose an image no larger than 2 MB."
  }

  return null
}

export function readDashboardAvatarFile(
  file: File
): Promise<DashboardAvatarUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("error", () => {
      reject(new Error("Could not read this image."))
    })
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read this image."))
        return
      }

      resolve({
        dataUrl: reader.result,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      })
    })
    reader.readAsDataURL(file)
  })
}

export function getDashboardAvatarPresentation(
  profile: DashboardProfile
): DashboardAvatarPresentation {
  if (profile.upload) {
    const restoresGoogleAvatar = Boolean(profile.googleAvatarUrl)
    return {
      alt: `${profile.username}'s uploaded avatar`,
      kind: "uploaded",
      restoreLabel: restoresGoogleAvatar
        ? "Remove upload and restore Google avatar"
        : "Remove upload and restore generated avatar",
      sourceLabel: "Uploaded avatar",
      url: profile.upload.dataUrl,
    }
  }

  if (profile.googleAvatarUrl) {
    return {
      alt: `${profile.username}'s Google avatar`,
      kind: "google",
      restoreLabel: null,
      sourceLabel: "Google avatar",
      url: profile.googleAvatarUrl,
    }
  }

  return {
    alt: `${profile.username}'s generated avatar`,
    kind: "generated",
    restoreLabel: null,
    sourceLabel: "Generated avatar",
    url: profile.generatedAvatarUrl,
  }
}

export function withDashboardAvatarUpload(
  profile: DashboardProfile,
  upload: DashboardAvatarUpload
): DashboardProfile {
  return { ...profile, upload }
}

export function withoutDashboardAvatarUpload(
  profile: DashboardProfile
): DashboardProfile {
  const { upload: _upload, ...restoredProfile } = profile
  return restoredProfile
}

export function areDashboardProfilesEqual(
  first: DashboardProfile,
  second: DashboardProfile
): boolean {
  return (
    first.email === second.email &&
    first.fixture === second.fixture &&
    first.generatedAvatarUrl === second.generatedAvatarUrl &&
    first.googleAvatarUrl === second.googleAvatarUrl &&
    first.username === second.username &&
    first.upload?.dataUrl === second.upload?.dataUrl &&
    first.upload?.fileName === second.upload?.fileName &&
    first.upload?.mimeType === second.upload?.mimeType &&
    first.upload?.size === second.upload?.size
  )
}
