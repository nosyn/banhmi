import type { OnApplicationBootstrap } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import { HELMET_OPTIONS } from '../tokens'
import { DEFAULT_HEADERS } from './headers'
import type { HelmetOptions } from './helmet.module'

/** Middleware function type used internally. */
type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

/**
 * Helmet middleware that appends security headers to every HTTP response.
 *
 * Registered automatically by {@link HelmetModule.forRoot}. Install pattern
 * follows `OnApplicationBootstrap` + `HTTP_ADAPTER_TOKEN` — no manual
 * `app.use()` call is needed.
 *
 * @example
 * HelmetModule.forRoot({ 'X-Frame-Options': 'DENY' })
 */
export class HelmetMiddleware implements OnApplicationBootstrap {
  static inject = [HELMET_OPTIONS, HTTP_ADAPTER_TOKEN] as const

  constructor(
    private readonly opts: HelmetOptions,
    private readonly adapter: HttpAdapter,
  ) {}

  /**
   * Called by the framework on bootstrap. Installs the header middleware.
   */
  onApplicationBootstrap(): void {
    this.adapter.use(this.buildMiddleware())
  }

  /**
   * Build the raw middleware function. Exposed for unit testing without a full
   * application lifecycle.
   *
   * @returns A middleware function that appends security headers to each
   *   response.
   *
   * @example
   * const mw = middleware.buildMiddleware()
   * const res = await mw(new Request('http://localhost/'), next)
   */
  buildMiddleware(): MiddlewareFn {
    // Compute the resolved header map once on construction
    const resolved = new Map<string, string>()
    for (const [header, defaultValue] of DEFAULT_HEADERS) {
      const key = header as keyof HelmetOptions
      const override = this.opts[key]
      if (override === false) continue
      resolved.set(header, override !== undefined ? override : defaultValue)
    }

    return async (_req: Request, next: () => Promise<Response>) => {
      const response = await next()
      const headers = new Headers(response.headers)
      for (const [header, value] of resolved) {
        headers.set(header, value)
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
  }
}
