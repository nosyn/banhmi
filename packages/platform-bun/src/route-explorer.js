import {
  CONTROLLER_METADATA,
  FILTERS_METADATA,
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  INTERCEPTORS_METADATA,
  METHOD_FILTERS_METADATA,
  METHOD_GUARDS_METADATA,
  METHOD_INTERCEPTORS_METADATA,
  RESPONSE_HEADERS_METADATA,
  ROUTE_METADATA,
} from '@banhmi/common'
export class RouteExplorer {
  explore(instance, controllerClass) {
    const classMeta = controllerClass[Symbol.metadata]
    if (!classMeta) return []
    const controllerMeta = classMeta[CONTROLLER_METADATA]
    if (!controllerMeta) return []
    const prefix = controllerMeta.prefix.replace(/\/$/, '')
    const routes = classMeta[ROUTE_METADATA]
    if (!routes) return []
    const classGuards = classMeta[GUARDS_METADATA] ?? []
    const classInterceptors = classMeta[INTERCEPTORS_METADATA] ?? []
    const classFilters = classMeta[FILTERS_METADATA] ?? []
    const methodGuardsMap = classMeta[METHOD_GUARDS_METADATA] ?? {}
    const methodInterceptorsMap = classMeta[METHOD_INTERCEPTORS_METADATA] ?? {}
    const methodFiltersMap = classMeta[METHOD_FILTERS_METADATA] ?? {}
    const httpCodes = classMeta[HTTP_CODE_METADATA] ?? {}
    const responseHeadersMap = classMeta[RESPONSE_HEADERS_METADATA] ?? {}
    const registered = []
    for (const [methodName, routeMeta] of Object.entries(routes)) {
      const routePath = routeMeta.path
        ? `${prefix}/${routeMeta.path.replace(/^\//, '')}`
        : prefix || '/'
      const normalizedPath = routePath.replace(/\/+/g, '/')
      const handlerFn = instance[methodName]
      if (typeof handlerFn !== 'function') continue
      const boundHandler = (ctx) => handlerFn.call(instance, ctx)
      registered.push({
        method: routeMeta.method,
        path: normalizedPath,
        handler: boundHandler,
        guards: [...classGuards, ...(methodGuardsMap[methodName] ?? [])],
        interceptors: [
          ...classInterceptors,
          ...(methodInterceptorsMap[methodName] ?? []),
        ],
        filters: [...classFilters, ...(methodFiltersMap[methodName] ?? [])],
        httpCode: httpCodes[methodName],
        responseHeaders: responseHeadersMap[methodName] ?? [],
        handlerClass: controllerClass,
        handlerName: methodName,
      })
    }
    return registered
  }
}
