import type { OnApplicationBootstrap } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import { CORS_OPTIONS } from '../tokens'
import type { CorsOptions } from './cors.module'
import { buildCorsHeaders, buildPreflightHeaders } from './handle'

/** Middleware function type used internally. */
type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

/**
 * CORS middleware that handles preflight `OPTIONS` requests and sets
 * `Access-Control-*` headers on all responses.
 *
 * Registered automatically by {@link CorsModule.forRoot}.
 *
 * @example
 * CorsModule.forRoot({ origin: 'https://example.com', credentials: true })
 */
export class CorsMiddleware implements OnApplicationBootstrap {
  static inject = [CORS_OPTIONS, HTTP_ADAPTER_TOKEN] as const

  constructor(
    private readonly opts: CorsOptions,
    private readonly adapter: HttpAdapter,
  ) {}

  /**
   * Called by the framework on bootstrap. Installs the CORS middleware.
   */
  onApplicationBootstrap(): void {
    this.adapter.use(this.buildMiddleware())
  }

  /**
   * Build the raw CORS middleware function. Exposed for unit testing.
   *
   * @returns A middleware function that handles CORS.
   *
   * @example
   * const mw = middleware.buildMiddleware()
   * const res = await mw(new Request('http://localhost/'), next)
   */
  buildMiddleware(): MiddlewareFn {
    return async (req: Request, next: () => Promise<Response>) => {
      const isPreflight =
        req.method === 'OPTIONS' &&
        req.headers.has('access-control-request-method')

      if (isPreflight) {
        const preflightHeaders = buildPreflightHeaders(req, this.opts)
        if (!preflightHeaders) {
          // Origin rejected — respond with plain 204, no CORS headers
          return new Response(null, { status: 204 })
        }
        return new Response(null, { status: 204, headers: preflightHeaders })
      }

      const response = await next()
      const corsHeaders = buildCorsHeaders(req, this.opts)
      if (!corsHeaders) return response

      const headers = new Headers(response.headers)
      for (const [k, v] of Object.entries(corsHeaders)) {
        headers.set(k, v)
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
  }
}
