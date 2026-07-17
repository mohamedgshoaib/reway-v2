import {
  ArchiveIcon,
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import * as React from "react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Meter,
  MeterLabel,
  MeterTrack,
  MeterIndicator,
  MeterValue,
} from "@/components/ui/meter"
import {
  Progress,
  ProgressLabel,
  ProgressTrack,
  ProgressIndicator,
  ProgressValue,
} from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { anchoredToastManager, toastManager } from "@/components/ui/toast"
import { AuditGroup, AuditSection } from "@/dev/ui-audit/section-shell"

export function FeedbackSection(): React.ReactElement {
  const anchorRef = React.useRef<HTMLButtonElement>(null)

  return (
    <AuditSection
      description="alert, toast, progress, meter, skeleton, spinner, empty."
      id="feedback"
      title="Feedback"
    >
      <AuditGroup label="Alert — variants" wrap={false}>
        <Alert variant="default">
          <InfoIcon />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            Enrichment runs in the background after saving.
          </AlertDescription>
        </Alert>
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>
            Uncollected uses system sorts only.
          </AlertDescription>
        </Alert>
        <Alert variant="success">
          <CheckCircleIcon />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>Bookmark added to your library.</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>Slow connection</AlertTitle>
          <AlertDescription>
            Enrichment may take longer than usual.
          </AlertDescription>
        </Alert>
        <Alert variant="error">
          <WarningCircleIcon />
          <AlertTitle>Enrichment failed</AlertTitle>
          <AlertDescription>The page could not be reached.</AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline">
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </AuditGroup>

      <AuditGroup label="Toast — trigger">
        <Button
          onClick={() =>
            toastManager.add({
              title: "Saved",
              description: "Bookmark added to your library.",
              type: "success",
            })
          }
          variant="outline"
        >
          Trigger success toast
        </Button>
        <Button
          onClick={() =>
            toastManager.add({
              title: "Enrichment failed",
              description: "Retry from the bookmark overflow menu.",
              type: "error",
            })
          }
          variant="outline"
        >
          Trigger error toast
        </Button>
        <Button
          onClick={() =>
            toastManager.add({
              title: "Importing bookmarks…",
              type: "loading",
            })
          }
          variant="outline"
        >
          Trigger loading toast
        </Button>
        <Button
          onClick={() => {
            if (anchorRef.current) {
              anchoredToastManager.add({
                title: "Copied!",
                positionerProps: { anchor: anchorRef.current },
                data: { tooltipStyle: true },
              })
            }
          }}
          ref={anchorRef}
          variant="outline"
        >
          Trigger anchored toast
        </Button>
      </AuditGroup>

      <AuditGroup label="Progress" wrap={false}>
        <Progress className="w-64" value={40}>
          <div className="flex justify-between">
            <ProgressLabel>Import progress</ProgressLabel>
            <ProgressValue />
          </div>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
      </AuditGroup>

      <AuditGroup label="Meter" wrap={false}>
        <Meter className="w-64" max={100} value={72}>
          <div className="flex justify-between">
            <MeterLabel>Storage used</MeterLabel>
            <MeterValue />
          </div>
          <MeterTrack>
            <MeterIndicator />
          </MeterTrack>
        </Meter>
      </AuditGroup>

      <AuditGroup label="Skeleton — shapes" wrap={false}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-24 w-64 rounded-lg" />
      </AuditGroup>

      <AuditGroup label="Spinner — sizes">
        <Spinner className="size-4" />
        <Spinner className="size-5" />
        <Spinner className="size-6" />
      </AuditGroup>

      <AuditGroup label="Empty state" wrap={false}>
        <Empty className="w-full rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArchiveIcon />
            </EmptyMedia>
            <EmptyTitle>No bookmarks yet</EmptyTitle>
            <EmptyDescription>
              Paste a URL anywhere on this page or use the command surface to
              save your first bookmark.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">Add bookmark</Button>
          </EmptyContent>
        </Empty>
      </AuditGroup>
    </AuditSection>
  )
}
