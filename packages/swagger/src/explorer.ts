import type { ClassConstructor, RouteDefinitionMeta } from '@banhmi/common'
import { CONTROLLER_METADATA, ROUTE_METADATA } from '@banhmi/common'
import type { OpenApiDocument } from './types'

export class SwaggerExplorer {
  explore(controllers: ClassConstructor[], doc: OpenApiDocument): void {
    for (const controller of controllers) {
      const classMeta = controller[Symbol.metadata] as Record<
        symbol,
        unknown
      > | null
      if (!classMeta) continue

      const controllerMeta = classMeta[CONTROLLER_METADATA] as
        | { prefix: string }
        | undefined
      if (!controllerMeta) continue

      const prefix = controllerMeta.prefix.replace(/\/$/, '')
      const routes = classMeta[ROUTE_METADATA] as
        | Record<string, RouteDefinitionMeta>
        | undefined
      if (!routes) continue

      for (const [_methodName, routeMeta] of Object.entries(routes)) {
        const routePath = routeMeta.path
          ? `${prefix}/${routeMeta.path.replace(/^\//, '')}`
          : prefix || '/'

        // Convert :param to {param} for OpenAPI, strip trailing slash
        const normalized = routePath
          .replace(/\/+/g, '/')
          .replace(/:([^/]+)/g, '{$1}')
        const openApiPath =
          normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized

        if (!doc.paths[openApiPath]) {
          doc.paths[openApiPath] = {}
        }

        const httpMethod = routeMeta.method.toLowerCase()
        const pathItem = doc.paths[openApiPath] as Record<string, unknown>
        pathItem[httpMethod] = {
          responses: {
            '200': { description: 'Success' },
          },
        }
      }
    }
  }
}
