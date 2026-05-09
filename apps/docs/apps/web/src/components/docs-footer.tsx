import { Link } from '@tanstack/react-router'

export function DocsFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 px-6 py-10 text-sm text-muted-foreground">
      <div className="mx-auto max-w-6xl">
        {/* Three-column row */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Left: brand */}
          <div className="space-y-2">
            <div className="font-semibold text-foreground">Banhmi</div>
            <p className="text-xs leading-relaxed">
              Bun-first, NestJS-inspired TypeScript web framework with TC39
              decorators and zero external HTTP dependencies.
            </p>
            <p className="text-xs">
              &copy; {new Date().getFullYear()} Banhmi contributors. MIT
              licence.
            </p>
          </div>

          {/* Middle: doc sections */}
          <div className="space-y-2">
            <div className="font-semibold text-foreground">Docs</div>
            <ul className="space-y-1">
              {[
                {
                  label: 'First Steps',
                  href: '/docs/introduction/first-steps',
                },
                { label: 'Overview', href: '/docs/overview/controllers' },
                {
                  label: 'Fundamentals',
                  href: '/docs/fundamentals/custom-providers',
                },
                {
                  label: 'Bun-native APIs',
                  href: '/docs/bun-native/bun-serve',
                },
                { label: 'Recipes', href: '/docs/recipes/drizzle' },
                {
                  label: 'Deployment',
                  href: '/docs/deployment/standalone-apps',
                },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: external links */}
          <div className="space-y-2">
            <div className="font-semibold text-foreground">Community</div>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://github.com/nosyn/banhmi"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nosyn/banhmi/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  MIT Licence
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nosyn/banhmi/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Issue Tracker
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/nosyn/banhmi/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Changelog
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom credit */}
        <div className="mt-8 border-t border-border pt-4 text-center text-xs">
          Built with{' '}
          <a
            href="https://bun.sh"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            Bun
          </a>{' '}
          &middot;{' '}
          <a
            href="https://tanstack.com/start"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            TanStack Start
          </a>
        </div>
      </div>
    </footer>
  )
}
