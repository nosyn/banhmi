import type { ClassConstructor, HttpMethod, Interceptor, RouteCtx } from '@banhmi/common'

export type InterceptorOrClass = ClassConstructor | Interceptor

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
}
