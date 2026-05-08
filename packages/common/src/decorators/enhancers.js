import {
  CUSTOM_ROUTE_METADATA,
  FILTERS_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  METHOD_FILTERS_METADATA,
  METHOD_GUARDS_METADATA,
  METHOD_INTERCEPTORS_METADATA,
  PIPES_METADATA,
} from '../metadata-keys'

function makeClassOrMethodDecorator(classMetaKey, methodMetaKey, values) {
  return (_target, context) => {
    if (context.kind === 'class') {
      const existing = context.metadata[classMetaKey] ?? []
      context.metadata[classMetaKey] = [...existing, ...values]
    } else {
      const methodName = context.name
      const existing = context.metadata[methodMetaKey] ?? {}
      context.metadata[methodMetaKey] = {
        ...existing,
        [methodName]: [...(existing[methodName] ?? []), ...values],
      }
    }
  }
}
export function UseGuards(...guards) {
  return makeClassOrMethodDecorator(
    GUARDS_METADATA,
    METHOD_GUARDS_METADATA,
    guards,
  )
}
export function UseInterceptors(...interceptors) {
  return makeClassOrMethodDecorator(
    INTERCEPTORS_METADATA,
    METHOD_INTERCEPTORS_METADATA,
    interceptors,
  )
}
export function UseFilters(...filters) {
  return makeClassOrMethodDecorator(
    FILTERS_METADATA,
    METHOD_FILTERS_METADATA,
    filters,
  )
}
export function UsePipes(...pipes) {
  return makeClassOrMethodDecorator(PIPES_METADATA, PIPES_METADATA, pipes)
}
export function SetMetadata(key, value) {
  return (_target, context) => {
    if (!context.metadata[CUSTOM_ROUTE_METADATA])
      context.metadata[CUSTOM_ROUTE_METADATA] = {}
    const custom = context.metadata[CUSTOM_ROUTE_METADATA]
    const methodName = context.name
    if (!custom[methodName]) custom[methodName] = {}
    const methodMeta = custom[methodName]
    methodMeta[key] = value
  }
}
