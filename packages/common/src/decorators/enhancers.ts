import {
  CUSTOM_ROUTE_METADATA,
  FILTERS_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  PIPES_METADATA,
} from '../metadata-keys'
import type { ClassConstructor } from '../interfaces/module-metadata'

function makeClassOrMethodDecorator(metaKey: symbol, values: ClassConstructor[]) {
  return function (
    _target: unknown,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): void {
    const existing = (context.metadata[metaKey] as ClassConstructor[] | undefined) ?? []
    context.metadata[metaKey] = [...existing, ...values]
  }
}

export function UseGuards(...guards: ClassConstructor[]) {
  return makeClassOrMethodDecorator(GUARDS_METADATA, guards)
}

export function UseInterceptors(...interceptors: ClassConstructor[]) {
  return makeClassOrMethodDecorator(INTERCEPTORS_METADATA, interceptors)
}

export function UseFilters(...filters: ClassConstructor[]) {
  return makeClassOrMethodDecorator(FILTERS_METADATA, filters)
}

export function UsePipes(...pipes: ClassConstructor[]) {
  return makeClassOrMethodDecorator(PIPES_METADATA, pipes)
}

export function SetMetadata(key: string, value: unknown) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[CUSTOM_ROUTE_METADATA]) context.metadata[CUSTOM_ROUTE_METADATA] = {}
    const custom = context.metadata[CUSTOM_ROUTE_METADATA] as Record<string, Record<string, unknown>>
    if (!custom[context.name as string]) custom[context.name as string] = {}
    custom[context.name as string]![key] = value
  }
}
