import { resolve } from 'node:path'
import type { OnApplicationBootstrap } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import type { StaticOptions } from './static.module'
import { STATIC_OPTIONS } from './tokens'

/** Middleware function type used internally. */
type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

/**
 * Bun-native static file interceptor that serves files from a directory
 * using `Bun.file()` (zero-copy). Installed as request middleware via
 * {@link HTTP_ADAPTER_TOKEN} on application bootstrap.
 *
 * Registered automatically by {@link StaticModule.forRoot}. You do not
 * need to instantiate this class manually.
 *
 * @example
 * // Registered automatically:
 * StaticModule.forRoot({ root: './public', prefix: '/static' })
 */
export class ServeStaticInterceptor implements OnApplicationBootstrap {
  static inject = [STATIC_OPTIONS, HTTP_ADAPTER_TOKEN] as const

  private readonly absoluteRoot: string
  private readonly prefix: string
  private readonly maxAge: number
  private readonly immutable: boolean
  private readonly fallthrough: boolean
  private readonly index: string | false

  constructor(
    readonly opts: StaticOptions,
    private readonly adapter: HttpAdapter,
  ) {
    this.absoluteRoot = resolve(process.cwd(), opts.root)
    this.prefix = (opts.prefix ?? '/').replace(/\/$/, '') // strip trailing /
    this.maxAge = opts.maxAge ?? 86400
    this.immutable = opts.immutable ?? false
    this.fallthrough = opts.fallthrough ?? true
    this.index = opts.index === undefined ? 'index.html' : opts.index
  }

  /**
   * Called by the framework at application bootstrap. Installs the static
   * file middleware on the adapter.
   */
  onApplicationBootstrap(): void {
    const middleware = this.buildMiddleware()
    this.adapter.use(middleware)
  }

  /**
   * Build and return the raw middleware function that handles static file
   * requests. Exposed so that it can be used standalone in tests without
   * needing the full application lifecycle.
   *
   * @example
   * const mw = interceptor.buildMiddleware()
   * const res = await mw(new Request('http://localhost/static/hello.txt'), next)
   */
  buildMiddleware(): MiddlewareFn {
    return async (req: Request, next: () => Promise<Response>) => {
      const url = new URL(req.url)
      const pathname = url.pathname

      // Only handle requests that start with the configured prefix
      const prefixWithSlash = this.prefix === '' ? '/' : `${this.prefix}/`
      const exactPrefix = this.prefix === '' ? '' : this.prefix

      const startsWithPrefix =
        pathname === exactPrefix ||
        pathname.startsWith(prefixWithSlash) ||
        (exactPrefix === '' && true)

      if (!startsWithPrefix) {
        return next()
      }

      // Strip prefix to get the relative path
      let relative = pathname.slice(exactPrefix.length) || '/'

      // Handle index file for directory paths
      if (relative.endsWith('/') || relative === '') {
        if (this.index === false) {
          if (this.fallthrough) return next()
          return new Response('Not Found', { status: 404 })
        }
        relative = `${relative}${this.index}`.replace(/\/\//g, '/')
      }

      // Resolve to absolute path
      const stripped = relative.startsWith('/') ? relative.slice(1) : relative
      const absolutePath = resolve(this.absoluteRoot, stripped)

      // Guard against path traversal: resolved path must be inside root
      if (
        !absolutePath.startsWith(`${this.absoluteRoot}/`) &&
        absolutePath !== this.absoluteRoot
      ) {
        return new Response('Forbidden', { status: 403 })
      }

      const file = Bun.file(absolutePath)
      const exists = await file.exists()

      if (!exists) {
        if (this.fallthrough) return next()
        return new Response('Not Found', { status: 404 })
      }

      let cacheControl = `public, max-age=${this.maxAge}`
      if (this.immutable) {
        cacheControl += ', immutable'
      }

      return new Response(file, {
        headers: {
          'cache-control': cacheControl,
          'content-type': file.type,
        },
      })
    }
  }
}
