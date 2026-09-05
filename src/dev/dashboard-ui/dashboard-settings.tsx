import { ArrowLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getDashboardUsernameError } from "@/dev/dashboard-ui/dashboard-account"
import { DashboardAccountPanel } from "@/dev/dashboard-ui/dashboard-account-panel"
import type { DashboardAccountState } from "@/dev/dashboard-ui/dashboard-account-state"
import { DashboardDemoPanel } from "@/dev/dashboard-ui/dashboard-demo-panel"
import { DashboardProfilePanel } from "@/dev/dashboard-ui/dashboard-profile-panel"
import { DashboardProfileSetupDialog } from "@/dev/dashboard-ui/dashboard-profile-setup"
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

type SettingsPage = "profile" | "account" | "demo"

const SETTINGS_PAGES = [
  { label: "Profile", value: "profile" },
  { label: "Account", value: "account" },
  { label: "Demo", value: "demo" },
] as const satisfies ReadonlyArray<{
  label: string
  value: SettingsPage
}>

const SETTINGS_PAGE_HEADING_IDS: Record<SettingsPage, string> = {
  account: "account-settings-title",
  demo: "demo-settings-title",
  profile: "profile-settings-title",
}

export function DashboardSettingsDialog({
  account,
  finalFocus,
  onOpenChange,
  open,
}: {
  account: DashboardAccountState
  finalFocus: React.RefObject<HTMLElement | null>
  onOpenChange: (open: boolean) => void
  open: boolean
}): React.ReactElement {
  const isMobile = useIsMobile()
  const [activePage, setActivePage] = React.useState<SettingsPage>("profile")
  const [mobileIndexOpen, setMobileIndexOpen] = React.useState(true)
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const pageContentRef = React.useRef<HTMLDivElement>(null)
  const mobileNavigationRefs = React.useRef<
    Partial<Record<SettingsPage, HTMLButtonElement | null>>
  >({})
  const profilePending = account.profile.status === "pending"

  const closeSettings = (): void => {
    setMobileIndexOpen(true)
    onOpenChange(false)
  }

  const requestClose = (): void => {
    if (profilePending) return
    if (account.profile.dirty) {
      setDiscardOpen(true)
      return
    }
    closeSettings()
  }

  const openSettingsPage = (page: SettingsPage): void => {
    setActivePage(page)
    if (!isMobile) return
    setMobileIndexOpen(false)
    queueMicrotask(() => pageContentRef.current?.focus())
  }

  const openMobileIndex = (): void => {
    setMobileIndexOpen(true)
    queueMicrotask(() => mobileNavigationRefs.current[activePage]?.focus())
  }

  return (
    <>
      <Dialog
        disablePointerDismissal={account.profile.dirty || profilePending}
        onOpenChange={(nextOpen, eventDetails) => {
          if (nextOpen) {
            onOpenChange(true)
            return
          }
          if (profilePending) {
            eventDetails.cancel()
            return
          }
          eventDetails.cancel()
          requestClose()
        }}
        open={open}
      >
        <DialogPopup
          bottomStickOnMobile={false}
          className="h-[min(40rem,calc(100svh-2rem))] max-w-3xl max-[799px]:row-start-1 max-[799px]:h-svh max-[799px]:max-h-none max-[799px]:rounded-none max-[799px]:border-0 max-[799px]:before:hidden"
          finalFocus={finalFocus}
          viewportProps={{
            className: "max-[799px]:grid-rows-[1fr] max-[799px]:p-0",
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your profile and review account controls.
            </DialogDescription>
          </DialogHeader>
          {isMobile ? (
            mobileIndexOpen ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-border px-5 py-4 pe-14">
                  <p className="font-heading text-xl leading-none font-semibold text-balance">
                    Settings
                  </p>
                  <p className="mt-2 text-sm text-pretty text-muted-foreground">
                    Manage your profile and account.
                  </p>
                </div>
                <SettingsNavigation
                  activePage={activePage}
                  buttonRefs={mobileNavigationRefs}
                  className="flex-1 p-3"
                  mobile
                  onPageChange={openSettingsPage}
                  showCurrent={false}
                />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-border px-3 py-2 pe-14">
                  <Button
                    className="-ms-1 px-2"
                    onClick={openMobileIndex}
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeftIcon />
                    Settings
                  </Button>
                </div>
                <SettingsPageContent
                  account={account}
                  contentRef={pageContentRef}
                  page={activePage}
                />
              </div>
            )
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[12rem_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-e border-border p-4">
                <div className="mb-5 px-2 pe-8">
                  <p className="font-heading text-xl leading-none font-semibold text-balance">
                    Settings
                  </p>
                  <p className="mt-2 text-xs text-pretty text-muted-foreground">
                    Profile and account controls.
                  </p>
                </div>
                <SettingsNavigation
                  activePage={activePage}
                  className="min-h-0 flex-1"
                  onPageChange={openSettingsPage}
                />
              </aside>
              <SettingsPageContent
                account={account}
                contentRef={pageContentRef}
                page={activePage}
              />
            </div>
          )}
        </DialogPopup>
      </Dialog>

      <AlertDialog
        onOpenChange={(nextOpen, eventDetails) => {
          if (!nextOpen && profilePending) {
            eventDetails.cancel()
            return
          }
          setDiscardOpen(nextOpen)
        }}
        open={discardOpen}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Save profile changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Save this username and avatar, or discard the draft before closing
              Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="ghost" />}>
              Keep editing
            </AlertDialogClose>
            <Button
              disabled={profilePending}
              onClick={() => {
                account.actions.discardProfileDraft()
                setDiscardOpen(false)
                closeSettings()
              }}
              type="button"
              variant="secondary"
            >
              Discard and close
            </Button>
            <Button
              disabled={Boolean(
                getDashboardUsernameError(account.profile.draft.username)
              )}
              loading={profilePending}
              onClick={async () => {
                const saved = await account.actions.saveProfile()
                if (saved) {
                  setDiscardOpen(false)
                  closeSettings()
                  return
                }
                setDiscardOpen(false)
                setActivePage("profile")
                setMobileIndexOpen(false)
              }}
              type="button"
            >
              Save and close
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <DashboardProfileSetupDialog account={account} />
    </>
  )
}

function SettingsNavigation({
  activePage,
  buttonRefs,
  className,
  mobile = false,
  onPageChange,
  showCurrent = true,
}: {
  activePage: SettingsPage
  buttonRefs?: React.RefObject<
    Partial<Record<SettingsPage, HTMLButtonElement | null>>
  >
  className?: string
  mobile?: boolean
  onPageChange: (page: SettingsPage) => void
  showCurrent?: boolean
}): React.ReactElement {
  return (
    <nav aria-label="Settings pages" className={cn("flex flex-col", className)}>
      {SETTINGS_PAGES.map((page, index) => {
        const current = showCurrent && activePage === page.value
        const isDemo = page.value === "demo"

        return (
          <div
            className={cn(
              isDemo && "mt-auto border-t border-border pt-3",
              !isDemo && index > 0 && "mt-1"
            )}
            key={page.value}
          >
            <Button
              aria-current={current ? "page" : undefined}
              className={cn(
                "w-full justify-start border-transparent px-3 font-normal",
                mobile ? "h-11" : "h-9",
                current && "bg-accent font-medium"
              )}
              onClick={() => onPageChange(page.value)}
              ref={(button) => {
                if (buttonRefs) buttonRefs.current[page.value] = button
              }}
              type="button"
              variant="ghost"
            >
              <span>{page.label}</span>
              {mobile ? <CaretRightIcon className="ms-auto" /> : null}
            </Button>
          </div>
        )
      })}
    </nav>
  )
}

function SettingsPageContent({
  account,
  contentRef,
  page,
}: {
  account: DashboardAccountState
  contentRef: React.RefObject<HTMLDivElement | null>
  page: SettingsPage
}): React.ReactElement {
  return (
    <ScrollArea scrollFade>
      <section
        aria-labelledby={SETTINGS_PAGE_HEADING_IDS[page]}
        className="min-w-0 px-5 py-6 outline-none min-[800px]:px-8"
        id="settings-page-content"
        ref={contentRef}
        tabIndex={-1}
      >
        <div className="mx-auto w-full max-w-xl">
          {page === "profile" ? (
            <DashboardProfilePanel account={account} />
          ) : null}
          {page === "account" ? (
            <DashboardAccountPanel account={account} />
          ) : null}
          {page === "demo" ? <DashboardDemoPanel account={account} /> : null}
        </div>
      </section>
    </ScrollArea>
  )
}
