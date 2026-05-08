import type { ClassConstructor, RouteDefinitionMeta } from '@banhmi/common'
import { CONTROLLER_METADATA, ROUTE_METADATA } from '@banhmi/common'
import type {
  ApiBodyOptions,
  ApiOperationOptions,
  ApiParamOptions,
  ApiQueryOptions,
  ApiResponseOptions,
} from './decorators'
import {
  API_BODY_METADATA,
  API_EXCLUDE_ENDPOINT_METADATA,
  API_OPERATION_METADATA,
  API_PARAMS_METADATA,
  API_QUERY_METADATA,
  API_RESPONSES_METADATA,
  API_SECURITY_METADATA,
  API_TAGS_METADATA,
} from './decorators'
import type { OpenApiDocument } from './types'

/**
 * Walks all registered controllers and fills in the `paths` (and optionally
 * `tags`) sections of the provided OpenAPI document.
 *
 * @example
 * const doc = new DocumentBuilder().setTitle('API').setVersion('1').build()
 * new SwaggerExplorer().explore([CatsController], doc)
 */
export class SwaggerExplorer {
  /**
   * Populate `doc.paths` from the given controller classes.
   *
   * @param controllers - Array of controller class constructors.
   * @param doc - OpenAPI document to mutate in place.
   */
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

      // Collect controller-level tags
      const controllerTags = (classMeta[API_TAGS_METADATA] as string[]) ?? []
      const controllerSecurity =
        (classMeta[API_SECURITY_METADATA] as Array<Record<string, string[]>>) ??
        []

      // Per-method metadata maps
      const operationMeta =
        (classMeta[API_OPERATION_METADATA] as Record<
          string,
          ApiOperationOptions
        >) ?? {}
      const paramsMeta =
        (classMeta[API_PARAMS_METADATA] as Record<string, ApiParamOptions[]>) ??
        {}
      const queryMeta =
        (classMeta[API_QUERY_METADATA] as Record<string, ApiQueryOptions[]>) ??
        {}
      const bodyMeta =
        (classMeta[API_BODY_METADATA] as Record<string, ApiBodyOptions>) ?? {}
      const responsesMeta =
        (classMeta[API_RESPONSES_METADATA] as Record<
          string,
          ApiResponseOptions[]
        >) ?? {}
      const methodSecurityMeta =
        (classMeta[API_SECURITY_METADATA] as Array<Record<string, string[]>>) ??
        []
      const excludeSet =
        (classMeta[API_EXCLUDE_ENDPOINT_METADATA] as Set<string>) ??
        new Set<string>()

      for (const [methodName, routeMeta] of Object.entries(routes)) {
        if (excludeSet.has(methodName)) continue

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

        // Build operation object
        const operation: Record<string, unknown> = {}

        const tags = [...controllerTags]
        if (tags.length > 0) operation.tags = tags

        const opMeta = operationMeta[methodName]
        if (opMeta) {
          if (opMeta.summary) operation.summary = opMeta.summary
          if (opMeta.description) operation.description = opMeta.description
          if (opMeta.deprecated) operation.deprecated = opMeta.deprecated
        }

        // Security — merge controller-level + method-level
        const allSecurity = [...controllerSecurity, ...methodSecurityMeta]
        if (allSecurity.length > 0) operation.security = allSecurity

        // Parameters: path params + query params
        const parameters: unknown[] = []
        for (const p of paramsMeta[methodName] ?? []) {
          parameters.push({
            name: p.name,
            in: 'path',
            required: p.required ?? true,
            ...(p.description ? { description: p.description } : {}),
            schema: { type: p.type ?? 'string' },
          })
        }
        for (const q of queryMeta[methodName] ?? []) {
          parameters.push({
            name: q.name,
            in: 'query',
            required: q.required ?? false,
            ...(q.description ? { description: q.description } : {}),
            schema: { type: q.type ?? 'string' },
          })
        }
        if (parameters.length > 0) operation.parameters = parameters

        // Request body
        const body = bodyMeta[methodName]
        if (body) {
          operation.requestBody = {
            required: body.required ?? true,
            ...(body.description ? { description: body.description } : {}),
            content: {
              'application/json': {
                schema:
                  typeof body.type === 'string'
                    ? { type: body.type }
                    : { type: 'object' },
              },
            },
          }
        }

        // Responses
        const methodResponses = responsesMeta[methodName]
        if (methodResponses && methodResponses.length > 0) {
          const responses: Record<string, unknown> = {}
          for (const r of methodResponses) {
            responses[String(r.status)] = {
              description: r.description ?? 'Response',
              ...(r.schema
                ? { content: { 'application/json': { schema: r.schema } } }
                : {}),
            }
          }
          operation.responses = responses
        } else {
          operation.responses = { '200': { description: 'Success' } }
        }

        pathItem[httpMethod] = operation
      }
    }
  }
}
