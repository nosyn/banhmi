import type {
  ClassConstructor,
  HttpMethod,
  Interceptor,
  RouteCtx,
} from '@banhmi/common'

export type InterceptorOrClass = ClassConstructor | Interceptor

/**
 * Resolved middleware function type used at the route level.
 * Matches `MiddlewareFn` from `@banhmi/middleware` structurally.
 */
export type RouteMiddlewareFn = (
  req: Request,
  ctx: RouteCtx,
  next: () => Promise<Response>,
) => Promise<Response>

export interface RegisteredRoute {
  method: HttpMethod
  path: string
  handler: (ctx: RouteCtx) => Promise<unknown>
  guards: ClassConstructor[]
  interceptors: InterceptorOrClass[]
  filters: ClassConstructor[]
  httpCode: number | undefined
  responseHeaders: [string, string][]
  handlerClass?: ClassConstructor
  handlerName?: string
  /** API version string set by `@Version`, or `undefined` for unversioned routes. */
  version?: string
  /**
   * Resolved middleware functions collected from class-level and method-level
   * `@UseMiddleware` decorators, in order (class-level first, then method-level).
   */
  middlewares: RouteMiddlewareFn[]
}

export type MatchResult = Omit<RegisteredRoute, 'path'> & {
  params: Record<string, string>
}

function buildMatcher(
  pattern: string,
): (pathname: string) => Record<string, string> | null {
  const paramNames: string[] = []
  const regexSource = pattern
    .replace(/:([^/]+\?)/g, (_match, name: string) => {
      paramNames.push(name.slice(0, -1))
      return '([^/]*)'
    })
    .replace(/:([^/]+)/g, (_match, name: string) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    .replace(/\*/g, '(?:.*)')

  const regex = new RegExp(`^${regexSource}$`)

  return (pathname: string) => {
    const match = pathname.match(regex)
    if (!match) return null
    const params: Record<string, string> = {}
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1] ?? ''
    })
    return params
  }
}

export class RadixRouter {
  private routes: Array<
    RegisteredRoute & { matcher: (p: string) => Record<string, string> | null }
  > = []

  add(route: RegisteredRoute): void {
    this.routes.push({ ...route, matcher: buildMatcher(route.path) })
  }

  match(method: string, pathname: string): MatchResult | null {
    for (const route of this.routes) {
      if (route.method !== 'ALL' && route.method !== method) continue
      const params = route.matcher(pathname)
      if (params !== null) {
        const { path: _path, matcher: _matcher, ...rest } = route
        return { ...rest, params }
      }
    }
    return null
  }

  /**
   * Returns **all** routes whose path pattern and HTTP method match, in
   * registration order. Use this when version-filtering must inspect multiple
   * candidates before picking the best match.
   *
   * @param method - HTTP method string (e.g. `'GET'`).
   * @param pathname - URL pathname to match against.
   * @returns Ordered array of all matching routes with extracted path params.
   */
  matchAll(method: string, pathname: string): MatchResult[] {
    const results: MatchResult[] = []
    for (const route of this.routes) {
      if (route.method !== 'ALL' && route.method !== method) continue
      const params = route.matcher(pathname)
      if (params !== null) {
        const { path: _path, matcher: _matcher, ...rest } = route
        results.push({ ...rest, params })
      }
    }
    return results
  }
}
