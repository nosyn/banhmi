import { ROUTE_METADATA } from '../metadata-keys'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export interface RouteDefinitionMeta {
  method: HttpMethod
  path: string
}

function createRouteDecorator(method: HttpMethod) {
  return function (path = '') {
    return function (
      _target: unknown,
      context: ClassMethodDecoratorContext,
    ): void {
      if (!context.metadata[ROUTE_METADATA]) {
        context.metadata[ROUTE_METADATA] = {}
      }
      const routes = context.metadata[ROUTE_METADATA] as Record<string, RouteDefinitionMeta>
      routes[context.name as string] = { method, path }
    }
  }
}

export const Get = createRouteDecorator('GET')
export const Post = createRouteDecorator('POST')
export const Put = createRouteDecorator('PUT')
export const Patch = createRouteDecorator('PATCH')
export const Delete = createRouteDecorator('DELETE')
export const Options = createRouteDecorator('OPTIONS')
export const Head = createRouteDecorator('HEAD')

export function All(path = '') {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[ROUTE_METADATA]) {
      context.metadata[ROUTE_METADATA] = {}
    }
    const routes = context.metadata[ROUTE_METADATA] as Record<string, RouteDefinitionMeta>
    routes[context.name as string] = { method: 'GET', path }
  }
}
