import { TanStackDevtools } from "@tanstack/react-devtools"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { LazyMotion } from "motion/react"

import { ErrorState, UnexpectedErrorPage } from "@/components/error-state"
import { SoundProvider } from "@/components/providers/sound-provider"
import {
  ThemeProvider,
  ThemeScript,
} from "@/components/providers/theme-provider"

import appCss from "../styles.css?url"

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => <ErrorState kind="notFound" />,
  onCatch: console.error,
  errorComponent: ({ reset }) => <UnexpectedErrorPage reset={reset} />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <HeadContent />
      </head>
      <body className="relative antialiased">
        <SoundProvider>
          <ThemeProvider>
            <LazyMotion features={loadMotionFeatures} strict>
              <div className="relative isolate flex min-h-svh flex-col">
                {children}
              </div>
            </LazyMotion>
          </ThemeProvider>
        </SoundProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
