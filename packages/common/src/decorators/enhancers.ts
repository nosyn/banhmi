import type { ClassConstructor } from '../interfaces/module-metadata'
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

function makeClassOrMethodDecorator(
  classMetaKey: symbol,
  methodMetaKey: symbol,
  values: ClassConstructor[],
) {
  return (
    _target: unknown,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): void => {
    if (context.kind === 'class') {
      const existing =
        (context.metadata[classMetaKey] as ClassConstructor[] | undefined) ?? []
      context.metadata[classMetaKey] = [...existing, ...values]
    } else {
      const methodName = context.name as string
      const existing =
        (context.metadata[methodMetaKey] as
          | Record<string, ClassConstructor[]>
          | undefined) ?? {}
      context.metadata[methodMetaKey] = {
        ...existing,
        [methodName]: [...(existing[methodName] ?? []), ...values],
      }
    }
  }
}

export function UseGuards(...guards: ClassConstructor[]) {
  return makeClassOrMethodDecorator(GUARDS_METADATA, METHOD_GUARDS_METADATA, guards)
}

export function UseInterceptors(...interceptors: ClassConstructor[]) {
  return makeClassOrMethodDecorator(INTERCEPTORS_METADATA, METHOD_INTERCEPTORS_METADATA, interceptors)
}

export function UseFilters(...filters: ClassConstructor[]) {
  return makeClassOrMethodDecorator(FILTERS_METADATA, METHOD_FILTERS_METADATA, filters)
}

export function UsePipes(...pipes: ClassConstructor[]) {
  return makeClassOrMethodDecorator(PIPES_METADATA, PIPES_METADATA, pipes)
}

export function SetMetadata(key: string, value: unknown) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    if (!context.metadata[CUSTOM_ROUTE_METADATA])
      context.metadata[CUSTOM_ROUTE_METADATA] = {}
    const custom = context.metadata[CUSTOM_ROUTE_METADATA] as Record<
      string,
      Record<string, unknown>
    >
    const methodName = context.name as string
    if (!custom[methodName]) custom[methodName] = {}
    const methodMeta = custom[methodName] as Record<string, unknown>
    methodMeta[key] = value
  }
}
