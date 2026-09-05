import * as React from "react"

import {
  areDashboardProfilesEqual,
  createDefaultDashboardProfile,
  getDashboardUsernameError,
  normalizeDashboardUsername,
  type DashboardAccountMutation,
  type DashboardAccountMutationAdapter,
  type DashboardAvatarUpload,
  type DashboardFixtureOutcome,
  type DashboardProfile,
  type DashboardProfileFixture,
} from "@/dev/dashboard-ui/dashboard-account"

const MOCK_ACCOUNT_MUTATION_DELAY_MS = 450

export type DashboardAccountStatus = "idle" | "pending" | "success" | "error"

export interface DashboardAccountState {
  deletion: {
    message: string | null
    status: DashboardAccountStatus
  }
  demo: {
    nextDeletionOutcome: DashboardFixtureOutcome
    nextProfileOutcome: DashboardFixtureOutcome
    profileFixture: DashboardProfileFixture
  }
  onboarding: {
    draft: DashboardProfile
    message: string | null
    open: boolean
    status: DashboardAccountStatus
  }
  profile: {
    draft: DashboardProfile
    dirty: boolean
    message: string | null
    saved: DashboardProfile
    status: DashboardAccountStatus
  }
  actions: {
    acknowledgeDeletion: () => void
    deleteAccount: () => Promise<boolean>
    discardProfileDraft: () => void
    finishOnboarding: () => Promise<boolean>
    openOnboarding: () => void
    removeOnboardingAvatar: () => void
    removeProfileAvatar: () => void
    resetDemo: () => void
    saveProfile: () => Promise<boolean>
    setNextDeletionOutcome: (outcome: DashboardFixtureOutcome) => void
    setNextProfileOutcome: (outcome: DashboardFixtureOutcome) => void
    setOnboardingAvatar: (upload: DashboardAvatarUpload) => void
    setOnboardingOpen: (open: boolean) => void
    setOnboardingUsername: (username: string) => void
    setProfileAvatar: (upload: DashboardAvatarUpload) => void
    setProfileFixture: (fixture: DashboardProfileFixture) => void
    setProfileUsername: (username: string) => void
    skipOnboarding: () => void
  }
}

function runDefaultAccountMutation(
  mutation: DashboardAccountMutation,
  outcome: DashboardFixtureOutcome
): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outcome === "failure") {
        reject(
          new Error(
            mutation.kind === "save-profile"
              ? "Could not save profile."
              : "Could not delete account."
          )
        )
        return
      }
      resolve()
    }, MOCK_ACCOUNT_MUTATION_DELAY_MS)
  })
}

function normalizeProfile(profile: DashboardProfile): DashboardProfile {
  return {
    ...profile,
    username: normalizeDashboardUsername(profile.username),
  }
}

export function useDashboardAccountState({
  initialOnboardingOpen = false,
  initialProfileFixture = "email",
  mutationAdapter,
}: {
  initialOnboardingOpen?: boolean
  initialProfileFixture?: DashboardProfileFixture
  mutationAdapter?: DashboardAccountMutationAdapter
} = {}): DashboardAccountState {
  const [savedProfile, setSavedProfile] = React.useState(() =>
    createDefaultDashboardProfile(initialProfileFixture)
  )
  const [profileDraft, setProfileDraft] = React.useState(() =>
    createDefaultDashboardProfile(initialProfileFixture)
  )
  const [profileStatus, setProfileStatus] =
    React.useState<DashboardAccountStatus>("idle")
  const [profileMessage, setProfileMessage] = React.useState<string | null>(
    null
  )
  const [nextProfileOutcome, setNextProfileOutcome] =
    React.useState<DashboardFixtureOutcome>("success")
  const [nextDeletionOutcome, setNextDeletionOutcome] =
    React.useState<DashboardFixtureOutcome>("success")
  const [onboardingOpen, setOnboardingOpen] = React.useState(
    initialOnboardingOpen
  )
  const [onboardingDraft, setOnboardingDraft] = React.useState(() =>
    createDefaultDashboardProfile(initialProfileFixture)
  )
  const [onboardingStatus, setOnboardingStatus] =
    React.useState<DashboardAccountStatus>("idle")
  const [onboardingMessage, setOnboardingMessage] = React.useState<
    string | null
  >(null)
  const [deletionStatus, setDeletionStatus] =
    React.useState<DashboardAccountStatus>("idle")
  const [deletionMessage, setDeletionMessage] = React.useState<string | null>(
    null
  )
  const profileMutationTokenRef = React.useRef(0)
  const deletionMutationTokenRef = React.useRef(0)

  const runMutation = async (
    mutation: DashboardAccountMutation,
    outcome: DashboardFixtureOutcome
  ): Promise<void> => {
    if (mutationAdapter) {
      await mutationAdapter(mutation)
      return
    }
    await runDefaultAccountMutation(mutation, outcome)
  }

  const updateProfileDraft = (
    update: (current: DashboardProfile) => DashboardProfile
  ): void => {
    setProfileDraft(update)
    setProfileStatus("idle")
    setProfileMessage(null)
  }

  const updateOnboardingDraft = (
    update: (current: DashboardProfile) => DashboardProfile
  ): void => {
    setOnboardingDraft(update)
    setOnboardingStatus("idle")
    setOnboardingMessage(null)
  }

  const saveProfileCandidate = async ({
    candidate,
    source,
  }: {
    candidate: DashboardProfile
    source: "onboarding" | "settings"
  }): Promise<boolean> => {
    if (getDashboardUsernameError(candidate.username)) return false

    const normalizedProfile = normalizeProfile(candidate)
    const token = profileMutationTokenRef.current + 1
    profileMutationTokenRef.current = token
    const outcome = nextProfileOutcome
    setNextProfileOutcome("success")
    if (source === "settings") {
      setProfileStatus("pending")
      setProfileMessage("Saving profile...")
    } else {
      setOnboardingStatus("pending")
      setOnboardingMessage("Saving profile...")
    }

    try {
      await runMutation(
        { kind: "save-profile", profile: normalizedProfile },
        outcome
      )
      if (profileMutationTokenRef.current !== token) return false

      setSavedProfile(normalizedProfile)
      setProfileDraft(normalizedProfile)
      setProfileStatus("success")
      setProfileMessage("Profile saved.")
      if (source === "onboarding") {
        setOnboardingDraft(normalizedProfile)
        setOnboardingStatus("success")
        setOnboardingMessage("Profile saved.")
        setOnboardingOpen(false)
      }
      return true
    } catch {
      if (profileMutationTokenRef.current !== token) return false
      const message = "Could not save profile. Your changes are still here."
      if (source === "settings") {
        setProfileStatus("error")
        setProfileMessage(message)
      } else {
        setOnboardingStatus("error")
        setOnboardingMessage(message)
      }
      return false
    }
  }

  const resetToFixture = (fixture: DashboardProfileFixture): void => {
    profileMutationTokenRef.current += 1
    deletionMutationTokenRef.current += 1
    const profile = createDefaultDashboardProfile(fixture)
    setSavedProfile(profile)
    setProfileDraft(profile)
    setProfileStatus("idle")
    setProfileMessage(null)
    setOnboardingDraft(profile)
    setOnboardingOpen(false)
    setOnboardingStatus("idle")
    setOnboardingMessage(null)
    setDeletionStatus("idle")
    setDeletionMessage(null)
    setNextProfileOutcome("success")
    setNextDeletionOutcome("success")
  }

  return {
    actions: {
      acknowledgeDeletion: () => resetToFixture("email"),
      deleteAccount: async () => {
        if (deletionStatus === "pending") return false
        const token = deletionMutationTokenRef.current + 1
        deletionMutationTokenRef.current = token
        const outcome = nextDeletionOutcome
        setNextDeletionOutcome("success")
        setDeletionStatus("pending")
        setDeletionMessage("Deleting account...")
        try {
          await runMutation({ kind: "delete-account" }, outcome)
          if (deletionMutationTokenRef.current !== token) return false
          setDeletionStatus("success")
          setDeletionMessage(
            "Demo complete. No account was deleted and this session is still active."
          )
          return true
        } catch {
          if (deletionMutationTokenRef.current !== token) return false
          setDeletionStatus("error")
          setDeletionMessage(
            "Could not delete the account. Check the confirmation and try again."
          )
          return false
        }
      },
      discardProfileDraft: () => {
        profileMutationTokenRef.current += 1
        setProfileDraft(savedProfile)
        setProfileStatus("idle")
        setProfileMessage(null)
      },
      finishOnboarding: () =>
        saveProfileCandidate({
          candidate: onboardingDraft,
          source: "onboarding",
        }),
      openOnboarding: () => {
        const defaultProfile = createDefaultDashboardProfile(
          savedProfile.fixture
        )
        setOnboardingDraft(defaultProfile)
        setOnboardingStatus("idle")
        setOnboardingMessage(null)
        setOnboardingOpen(true)
      },
      removeOnboardingAvatar: () =>
        updateOnboardingDraft((current) => {
          const { upload: _upload, ...profile } = current
          return profile
        }),
      removeProfileAvatar: () =>
        updateProfileDraft((current) => {
          const { upload: _upload, ...profile } = current
          return profile
        }),
      resetDemo: () => resetToFixture("email"),
      saveProfile: () =>
        saveProfileCandidate({ candidate: profileDraft, source: "settings" }),
      setNextDeletionOutcome,
      setNextProfileOutcome,
      setOnboardingAvatar: (upload) =>
        updateOnboardingDraft((current) => ({ ...current, upload })),
      setOnboardingOpen,
      setOnboardingUsername: (username) =>
        updateOnboardingDraft((current) => ({ ...current, username })),
      setProfileAvatar: (upload) =>
        updateProfileDraft((current) => ({ ...current, upload })),
      setProfileFixture: resetToFixture,
      setProfileUsername: (username) =>
        updateProfileDraft((current) => ({ ...current, username })),
      skipOnboarding: () => {
        const defaultProfile = createDefaultDashboardProfile(
          savedProfile.fixture
        )
        setSavedProfile(defaultProfile)
        setProfileDraft(defaultProfile)
        setOnboardingDraft(defaultProfile)
        setOnboardingStatus("idle")
        setOnboardingMessage(null)
        setOnboardingOpen(false)
      },
    },
    deletion: {
      message: deletionMessage,
      status: deletionStatus,
    },
    demo: {
      nextDeletionOutcome,
      nextProfileOutcome,
      profileFixture: savedProfile.fixture,
    },
    onboarding: {
      draft: onboardingDraft,
      message: onboardingMessage,
      open: onboardingOpen,
      status: onboardingStatus,
    },
    profile: {
      draft: profileDraft,
      dirty: !areDashboardProfilesEqual(savedProfile, profileDraft),
      message: profileMessage,
      saved: savedProfile,
      status: profileStatus,
    },
  }
}
