import { Link, useCanGoBack, useRouter } from "@tanstack/react-router"

import { Button, buttonVariants } from "@/components/ui/button"

type ErrorStateProps =
  | { kind: "notFound" }
  | { kind: "unexpected"; onRetry: () => void }

const COPY = {
  notFound: {
    code: "404",
    title: "Page not found",
    description:
      "That page doesn't exist, or it's moved. Check the link, or head home.",
  },
  unexpected: {
    code: "500",
    title: "Something went wrong",
    description:
      "Something broke on our end. Try again, or come back in a moment.",
  },
} as const

export function ErrorState(props: ErrorStateProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const isNotFound = props.kind === "notFound"
  const copy = isNotFound ? COPY.notFound : COPY.unexpected

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="font-display text-6xl text-primary tabular-nums select-none sm:text-7xl"
      >
        {copy.code}
      </span>
      <div className="mt-8 flex max-w-md flex-col items-center">
        <h1 className="font-heading text-section-title text-balance">
          {copy.title}
        </h1>
        <p className="mt-4 text-content text-pretty text-muted-foreground">
          {copy.description}
        </p>
        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          {isNotFound ? (
            <Link
              className={buttonVariants({
                variant: "default",
                size: "xl",
                className: "w-full sm:w-auto",
              })}
              to="/"
            >
              Go home
            </Link>
          ) : (
            <Button
              className="w-full sm:w-auto"
              onClick={props.onRetry}
              size="xl"
            >
              Try again
            </Button>
          )}
          {isNotFound && canGoBack && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => router.history.back()}
              size="xl"
              variant="secondary"
            >
              Go back
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function UnexpectedErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter()

  return (
    <ErrorState
      kind="unexpected"
      onRetry={() => {
        reset()
        void router.invalidate()
      }}
    />
  )
}
