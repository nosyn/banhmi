import { Link } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

const FEATURES = [
  { icon: '⚡', title: 'HTTP & Routing', desc: 'Raw Bun.serve, Radix-tree router, middleware, versioning, cookies, SSE.' },
  { icon: '✅', title: 'Validation', desc: 'Zod ValidationPipe, ParseInt/UUID/Bool pipes, class-transformer serialisation.' },
  { icon: '🔒', title: 'Security', desc: 'Helmet, CORS, CSRF, throttler, JWT, HMAC/AES, Better Auth.' },
  { icon: '📊', title: 'Observability', desc: 'Structured logger, OpenTelemetry, Sentry, events, devtools.' },
  { icon: '🗄️', title: 'Data', desc: 'Postgres, MySQL, Drizzle ORM, MongoDB, SQLite, Redis, S3, cache.' },
  { icon: '📄', title: 'OpenAPI', desc: 'Auto-generated OpenAPI 3.1, Scalar UI, CLI plugin, SDL export.' },
  { icon: '🔷', title: 'GraphQL', desc: 'Code-first types, resolvers, subscriptions, federation, mapped types.' },
  { icon: '🔌', title: 'Microservices', desc: 'TCP, Redis, NATS, MQTT, RabbitMQ, ClientProxy.' },
  { icon: '🌐', title: 'Edge & Serverless', desc: 'Cloudflare Workers, AWS Lambda, raw-body, HTTPS, keep-alive.' },
] as const

const QUICKSTART = `bun create banhmi my-app
cd my-app
bun run dev`

function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 space-y-20">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">Banhmi</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Bun-first, NestJS-inspired TypeScript web framework. Full feature parity with NestJS
          {' — '} plus Bun-native superpowers.
        </p>

        {/* Marquee numbers */}
        <div className="flex justify-center gap-12 pt-4">
          {[
            { value: '154 ms', label: 'Cold-start' },
            { value: '63 MB', label: 'RSS at idle' },
            { value: '~120k', label: 'Req/s' },
          ].map(({ label, value }) => (
            <div className="text-center" key={label}>
              <div className="text-3xl font-bold text-primary">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/docs/introduction/first-steps"
          >
            Get started
          </Link>
          <a
            className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 font-medium transition-colors hover:bg-muted"
            href="https://github.com/banhmi/banhmi"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Quickstart */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Quickstart</h2>
        <pre className="overflow-x-auto rounded-xl bg-muted p-5 font-mono text-sm">
          <code>{QUICKSTART}</code>
        </pre>
        <p className="text-sm text-muted-foreground">
          Or add to an existing project:{' '}
          <code className="rounded bg-muted px-1">bun add banhmi</code>
        </p>
      </section>

      {/* Feature grid */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Everything you need</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ desc, icon, title }) => (
            <div
              className="space-y-2 rounded-xl border border-border p-5 transition-colors hover:border-primary/50"
              key={title}
            >
              <div className="text-2xl">{icon}</div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row">
        <p>{'© 2026 Banhmi contributors. MIT licence.'}</p>
        <div className="flex gap-6">
          <Link className="transition-colors hover:text-foreground" to="/docs/introduction/first-steps">
            Docs
          </Link>
          <a
            className="transition-colors hover:text-foreground"
            href="https://github.com/banhmi/banhmi"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  )
}
