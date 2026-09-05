import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  InfoIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
  WarningIcon,
  XLogoIcon,
} from "@phosphor-icons/react"
import type * as React from "react"

import {
  Alert,
  AlertDescription,
  AlertStatus,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { XImportPost } from "@/dev/dashboard-ui/dashboard-x-import"
import type {
  DashboardXImportState,
  XImportProgressStep,
} from "@/dev/dashboard-ui/dashboard-x-import-state"

const PROGRESS_LABELS: Record<XImportProgressStep, string> = {
  finishing: "Finishing import",
  preparing: "Preparing bookmarks",
  saving: "Importing bookmarks",
}

function bookmarkCountLabel(count: number): string {
  return `${count} ${count === 1 ? "bookmark" : "bookmarks"}`
}

function ChooseArchiveField({
  onChoose,
}: {
  onChoose: (fileName: string) => void
}): React.ReactElement {
  return (
    <Field>
      <FieldLabel htmlFor="x-bookmark-archive">X bookmark file</FieldLabel>
      <Input
        accept=".js,application/javascript,text/javascript"
        id="x-bookmark-archive"
        nativeInput
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) onChoose(file.name)
          event.currentTarget.value = ""
        }}
        type="file"
      />
      <FieldDescription>
        Choose bookmark.js or bookmarks.js from the data folder in your X
        archive.
      </FieldDescription>
    </Field>
  )
}

function ImportPageHeader(): React.ReactElement {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2
          className="font-heading text-xl font-semibold text-balance"
          id="import-settings-title"
        >
          Import
        </h2>
        <Badge variant="outline">
          <XLogoIcon aria-hidden="true" />X
        </Badge>
      </div>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        Review an X bookmark archive before adding its posts to your library.
      </p>
    </div>
  )
}

function ImportDisclosure(): React.ReactElement {
  return (
    <Alert variant="info">
      <InfoIcon />
      <AlertTitle>This is a local mock</AlertTitle>
      <AlertDescription>
        The selected file stays on this device. This mock checks its name and
        uses the archive fixture from Demo. It does not read or upload the file.
      </AlertDescription>
    </Alert>
  )
}

function DuplicateBadges({ post }: { post: XImportPost }): React.ReactElement {
  return (
    <>
      {post.duplicateKinds.includes("library") ? (
        <Badge size="sm" variant="warning">
          Already in library
        </Badge>
      ) : null}
      {post.duplicateKinds.includes("archive") ? (
        <Badge size="sm" variant="warning">
          Repeated in archive
        </Badge>
      ) : null}
    </>
  )
}

function ReviewPostRow({
  onSelectedChange,
  post,
  selected,
}: {
  onSelectedChange: (selected: boolean) => void
  post: XImportPost
  selected: boolean
}): React.ReactElement {
  const labelId = `x-import-${post.entryId}-label`
  const checkboxId = `x-import-${post.entryId}-checkbox`
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-border last:border-b-0">
      <div className="flex min-h-20 items-start justify-center pt-4">
        <Checkbox
          aria-labelledby={labelId}
          checked={selected}
          id={checkboxId}
          onCheckedChange={(checked) => onSelectedChange(checked === true)}
        />
      </div>
      <div className="min-w-0 py-3 pe-3">
        <Label
          className="block cursor-pointer text-sm font-medium text-pretty"
          htmlFor={checkboxId}
          id={labelId}
        >
          {post.excerpt ?? `X post ${post.postId}`}
        </Label>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {post.authorName ? (
            <span>
              {post.authorName} {post.authorHandle}
            </span>
          ) : (
            <span>Preview unavailable</span>
          )}
          <a
            className="truncate underline-offset-4 hover:text-foreground hover:underline"
            href={post.url}
            rel="noopener"
            target="_blank"
          >
            View post
          </a>
        </div>
        {post.duplicateKinds.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <DuplicateBadges post={post} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ReviewState({
  importState,
}: {
  importState: DashboardXImportState
}): React.ReactElement {
  const { actions, flow } = importState
  const review = flow.review
  if (!review) throw new Error("Review state requires archive results.")

  const selectedCount = flow.selectedIds.size
  const duplicateCount = review.posts.filter(
    (post) =>
      flow.selectedIds.has(post.entryId) && post.duplicateKinds.length > 0
  ).length

  return (
    <div className="grid gap-5">
      {review.skippedCount > 0 ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>
            Skipped {bookmarkCountLabel(review.skippedCount)}
          </AlertTitle>
          <AlertDescription>
            Those archive records did not contain a valid X post ID.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{review.fileName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {bookmarkCountLabel(selectedCount)} selected
            {duplicateCount > 0 ? `, ${duplicateCount} marked duplicate` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <Button onClick={actions.selectAll} size="xs" variant="ghost">
            Select all
          </Button>
          <Button onClick={actions.clearSelection} size="xs" variant="ghost">
            Clear selection
          </Button>
        </div>
      </div>

      <fieldset className="overflow-hidden rounded-xl border border-border">
        <legend className="sr-only">Bookmarks to import</legend>
        {review.posts.map((post) => (
          <ReviewPostRow
            key={post.entryId}
            onSelectedChange={(selected) =>
              actions.setPostSelected(post.entryId, selected)
            }
            post={post}
            selected={flow.selectedIds.has(post.entryId)}
          />
        ))}
      </fieldset>

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-5">
        <Button onClick={actions.chooseAnotherFile} variant="ghost">
          Choose another file
        </Button>
        <Button
          disabled={selectedCount === 0}
          onClick={() => void actions.startImport()}
        >
          Import {bookmarkCountLabel(selectedCount)}
        </Button>
      </div>
    </div>
  )
}

function ImportingState({
  importState,
}: {
  importState: DashboardXImportState
}): React.ReactElement {
  const { flow } = importState
  const label = flow.progressStep
    ? PROGRESS_LABELS[flow.progressStep]
    : "Importing bookmarks"

  return (
    <div className="grid gap-5 rounded-xl border border-border p-5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You may close Settings. The import will keep running.
        </p>
      </div>
      <output
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg bg-muted/72 px-3 py-2.5"
      >
        <Spinner aria-hidden="true" className="shrink-0" />
        <span className="text-sm font-medium">{label}</span>
        <span className="ms-auto text-sm text-muted-foreground tabular-nums">
          {flow.processedCount} of {flow.totalCount}
        </span>
      </output>
    </div>
  )
}

function FailedPostList({
  posts,
}: {
  posts: readonly XImportPost[]
}): React.ReactElement {
  if (posts.length === 0) return <></>
  return (
    <div className="rounded-xl border border-border">
      {posts.map((post) => (
        <div
          className="border-b border-border px-3 py-2.5 last:border-b-0"
          key={post.entryId}
        >
          <p className="text-sm font-medium text-pretty">
            {post.excerpt ?? `X post ${post.postId}`}
          </p>
          <p className="mt-0.5 text-xs text-destructive-foreground">
            Could not save this bookmark.
          </p>
        </div>
      ))}
    </div>
  )
}

function ResultState({
  importState,
  onViewImported,
}: {
  importState: DashboardXImportState
  onViewImported: () => void
}): React.ReactElement {
  const { actions, flow } = importState
  const failedPosts =
    flow.review?.posts.filter((post) => flow.failedIds.has(post.entryId)) ?? []
  const importedCount = flow.importedIds.size
  const hasFailures = failedPosts.length > 0
  const totalFailure = flow.stage === "error" && importedCount === 0

  return (
    <div className="grid gap-5">
      {totalFailure ? (
        <Alert variant="error">
          <WarningCircleIcon />
          <AlertTitle>No bookmarks imported</AlertTitle>
          <AlertDescription>{flow.message}</AlertDescription>
        </Alert>
      ) : hasFailures ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>Import finished with issues</AlertTitle>
          <AlertDescription>
            Imported {bookmarkCountLabel(importedCount)}. Failed to import{" "}
            {bookmarkCountLabel(failedPosts.length)}.
          </AlertDescription>
        </Alert>
      ) : (
        <AlertStatus variant="success">
          <CheckCircleIcon />
          <AlertTitle>Import complete</AlertTitle>
          <AlertDescription>
            Added {bookmarkCountLabel(importedCount)} to X Bookmarks.
          </AlertDescription>
        </AlertStatus>
      )}

      <FailedPostList posts={failedPosts} />

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-5">
        <Button onClick={actions.chooseAnotherFile} variant="ghost">
          Import another file
        </Button>
        <div className="flex flex-wrap gap-2">
          {hasFailures ? (
            <Button
              onClick={() => void actions.retryImport()}
              variant="outline"
            >
              <ArrowClockwiseIcon />
              {totalFailure ? "Retry import" : "Retry failed bookmarks"}
            </Button>
          ) : null}
          {importedCount > 0 ? (
            <Button onClick={onViewImported}>View imported bookmarks</Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function DashboardXImportPanel({
  importState,
  onViewImported,
}: {
  importState: DashboardXImportState
  onViewImported: () => void
}): React.ReactElement {
  const { actions, flow } = importState

  return (
    <div className="grid gap-6">
      <ImportPageHeader />

      {flow.stage === "choose" ? (
        <div className="grid gap-5">
          <ImportDisclosure />
          <ChooseArchiveField onChoose={actions.chooseFile} />
          <div className="flex gap-3 border-t border-border pt-5">
            <XLogoIcon className="mt-0.5 shrink-0" weight="duotone" />
            <div>
              <p className="text-sm font-medium">Extension scroll capture</p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                Scroll capture is a separate extension flow started by the user
                on the X bookmarks page. It is not part of this dashboard mock.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {flow.stage === "empty" ? (
        <Empty className="rounded-xl border border-border py-10 md:py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UploadSimpleIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No bookmarks found</EmptyTitle>
            <EmptyDescription>
              {flow.fileName} is valid but does not contain any X bookmarks.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ChooseArchiveField onChoose={actions.chooseFile} />
          </EmptyContent>
        </Empty>
      ) : null}

      {flow.stage === "error" && !flow.review ? (
        <div className="grid gap-5">
          <Alert variant="error">
            <WarningCircleIcon />
            <AlertTitle>Archive not ready</AlertTitle>
            <AlertDescription>{flow.message}</AlertDescription>
          </Alert>
          <ChooseArchiveField onChoose={actions.chooseFile} />
        </div>
      ) : null}

      {flow.stage === "review" ? (
        <ReviewState importState={importState} />
      ) : null}
      {flow.stage === "importing" ? (
        <ImportingState importState={importState} />
      ) : null}
      {flow.stage === "complete" || (flow.stage === "error" && flow.review) ? (
        <ResultState
          importState={importState}
          onViewImported={onViewImported}
        />
      ) : null}
    </div>
  )
}
