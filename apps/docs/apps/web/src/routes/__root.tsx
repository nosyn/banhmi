import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { TooltipProvider } from '@workspace/ui/components/tooltip'
import appCss from '@workspace/ui/globals.css?url'
import { AppSidebar } from '@/components/app-sidebar'
import { DocsFooter } from '@/components/docs-footer'
import { DocsHeader } from '@/components/docs-header'
import { DocPageLayout, DocsMdxProvider } from '@/components/mdx-provider'
import { ThemeProvider } from '@/components/theme-provider'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Banhmi — Docs',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function DocContent() {
  const { location } = useRouterState()
  const isDocPage = location.pathname.startsWith('/docs/')
  const outlet = <Outlet />

  return isDocPage ? <DocPageLayout>{outlet}</DocPageLayout> : outlet
}

function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        {/*
          SidebarProvider renders: div.flex.min-h-svh.w-full
          We override with flex-col so the sticky header stacks above the sidebar/content row.
        */}
        <SidebarProvider className="flex-col">
          <DocsHeader />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="flex flex-col min-w-0 overflow-y-auto">
              <DocsMdxProvider>
                <div className="flex-1">
                  <DocContent />
                </div>
              </DocsMdxProvider>
              <DocsFooter />
            </SidebarInset>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
