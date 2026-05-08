import type { OnApplicationBootstrap } from '@banhmi/common'
import { parseCookies, serializeCookie } from '@banhmi/cookies'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import { CSRF_OPTIONS } from '../tokens'
import type { CsrfOptions } from './csrf.module'
import { generateCsrfToken } from './token'

/** Middleware function type used internally. */
type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * CSRF double-submit cookie middleware.
 *
 * On safe methods, issues the CSRF token cookie if absent and reflects it in
 * the `x-csrf-token` response header. On unsafe methods, validates the token
 * against the cookie value; returns 403 on mismatch.
 *
 * Registered automatically by {@link CsrfModule.forRoot}.
 *
 * @example
 * CsrfModule.forRoot({ cookie: { secure: true, sameSite: 'strict' } })
 */
export class CsrfMiddleware implements OnApplicationBootstrap {
  static inject = [CSRF_OPTIONS, HTTP_ADAPTER_TOKEN] as const

  private readonly cookieName: string
  private readonly headerName: string
  private readonly formField: string

  constructor(
    private readonly opts: CsrfOptions,
    private readonly adapter: HttpAdapter,
  ) {
    this.cookieName = opts.cookieName ?? 'csrf-token'
    this.headerName = opts.headerName ?? 'x-csrf-token'
    this.formField = opts.formField ?? '_csrf'
  }

  /**
   * Called by the framework on bootstrap. Installs the CSRF middleware.
   */
  onApplicationBootstrap(): void {
    this.adapter.use(this.buildMiddleware())
  }

  /**
   * Build the raw CSRF middleware function. Exposed for unit testing.
   *
   * @returns A middleware function that enforces CSRF protection.
   *
   * @example
   * const mw = middleware.buildMiddleware()
   * const res = await mw(new Request('http://localhost/'), next)
   */
  buildMiddleware(): MiddlewareFn {
    const cookieName = this.cookieName
    const headerName = this.headerName
    const formField = this.formField
    const cookieOpts = this.opts.cookie ?? {}

    return async (req: Request, next: () => Promise<Response>) => {
      const cookieHeader = req.headers.get('cookie') ?? ''
      const cookies = parseCookies(cookieHeader)
      const existingToken = cookies[cookieName]

      if (SAFE_METHODS.has(req.method)) {
        const token = existingToken ?? generateCsrfToken()
        const response = await next()
        const headers = new Headers(response.headers)

        // Set or refresh the CSRF cookie
        if (!existingToken) {
          const setCookie = serializeCookie(cookieName, token, {
            path: '/',
            secure: cookieOpts.secure ?? false,
            sameSite: cookieOpts.sameSite ?? 'lax',
            httpOnly: cookieOpts.httpOnly ?? false,
          })
          headers.set('set-cookie', setCookie)
        }

        // Reflect token for SPA clients
        headers.set(headerName, token)

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      }

      if (UNSAFE_METHODS.has(req.method)) {
        if (!existingToken) {
          return new Response(
            JSON.stringify({ message: 'CSRF token mismatch' }),
            {
              status: 403,
              headers: { 'content-type': 'application/json' },
            },
          )
        }

        // Attempt to read from header first, then form body
        const headerToken = req.headers.get(headerName)
        let submittedToken = headerToken

        if (!submittedToken) {
          const contentType = req.headers.get('content-type') ?? ''
          if (contentType.includes('application/x-www-form-urlencoded')) {
            const body = await req.text()
            const params = new URLSearchParams(body)
            submittedToken = params.get(formField)
          }
        }

        if (!submittedToken || submittedToken !== existingToken) {
          return new Response(
            JSON.stringify({ message: 'CSRF token mismatch' }),
            {
              status: 403,
              headers: { 'content-type': 'application/json' },
            },
          )
        }
      }

      return next()
    }
  }
}
