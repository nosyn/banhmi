import { ROUTE_METADATA } from '../metadata-keys'

function createRouteDecorator(method) {
  return (path = '') =>
    (_target, context) => {
      if (!context.metadata[ROUTE_METADATA]) {
        context.metadata[ROUTE_METADATA] = {}
      }
      const routes = context.metadata[ROUTE_METADATA]
      routes[context.name] = { method, path }
    }
}
export const Get = createRouteDecorator('GET')
export const Post = createRouteDecorator('POST')
export const Put = createRouteDecorator('PUT')
export const Patch = createRouteDecorator('PATCH')
export const Delete = createRouteDecorator('DELETE')
export const Options = createRouteDecorator('OPTIONS')
export const Head = createRouteDecorator('HEAD')
export const All = createRouteDecorator('ALL')
