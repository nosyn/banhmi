import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { Sidebar } from '../components/sidebar'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Banhmi — Bun-first TypeScript Framework' },
    ],
    links: [
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },
    ],
  }),
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '2rem', maxWidth: '860px' }}>
            <Outlet />
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  ),
})
