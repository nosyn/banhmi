import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { TooltipProvider } from '@workspace/ui/components/tooltip'
import appCss from '@workspace/ui/globals.css?url'
import { AppSidebar } from '@/components/app-sidebar'
import { DocsMdxProvider } from '@/components/mdx-provider'

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

function RootLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DocsMdxProvider>
            <Outlet />
          </DocsMdxProvider>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
