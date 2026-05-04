import type {
  ClassConstructor,
  ControllerMetadata,
  RouteCtx,
  RouteDefinitionMeta,
} from '@banhmi/common'
import {
  CONTROLLER_METADATA,
  FILTERS_METADATA,
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  INTERCEPTORS_METADATA,
  RESPONSE_HEADERS_METADATA,
  ROUTE_METADATA,
} from '@banhmi/common'
import type { RegisteredRoute } from './router'

export class RouteExplorer {
  explore(
    instance: object,
    controllerClass: ClassConstructor,
  ): RegisteredRoute[] {
    const classMeta = controllerClass[Symbol.metadata] as Record<
      symbol,
      unknown
    > | null
    if (!classMeta) return []

    const controllerMeta = classMeta[CONTROLLER_METADATA] as
      | ControllerMetadata
      | undefined
    if (!controllerMeta) return []

    const prefix = controllerMeta.prefix.replace(/\/$/, '')

    const routes = classMeta[ROUTE_METADATA] as
      | Record<string, RouteDefinitionMeta>
      | undefined
    if (!routes) return []

    const classGuards =
      (classMeta[GUARDS_METADATA] as ClassConstructor[] | undefined) ?? []
    const classInterceptors =
      (classMeta[INTERCEPTORS_METADATA] as ClassConstructor[] | undefined) ?? []
    const classFilters =
      (classMeta[FILTERS_METADATA] as ClassConstructor[] | undefined) ?? []
    const httpCodes =
      (classMeta[HTTP_CODE_METADATA] as Record<string, number> | undefined) ??
      {}
    const responseHeadersMap =
      (classMeta[RESPONSE_HEADERS_METADATA] as
        | Record<string, [string, string][]>
        | undefined) ?? {}

    const registered: RegisteredRoute[] = []

    for (const [methodName, routeMeta] of Object.entries(routes)) {
      const routePath = routeMeta.path
        ? `${prefix}/${routeMeta.path.replace(/^\//, '')}`
        : prefix || '/'
      const normalizedPath = routePath.replace(/\/+/g, '/')

      const handlerFn = (instance as Record<string, unknown>)[methodName]
      if (typeof handlerFn !== 'function') continue

      const boundHandler = (ctx: RouteCtx) =>
        (handlerFn as (ctx: RouteCtx) => Promise<unknown>).call(instance, ctx)

      registered.push({
        method: routeMeta.method,
        path: normalizedPath,
        handler: boundHandler,
        guards: [...classGuards],
        interceptors: [...classInterceptors],
        filters: [...classFilters],
        httpCode: httpCodes[methodName],
        responseHeaders: responseHeadersMap[methodName] ?? [],
        handlerClass: controllerClass,
        handlerName: methodName,
      })
    }

    return registered
  }
}
