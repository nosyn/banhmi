import {
  FIELD_METADATA,
  INTERFACE_TYPE_METADATA,
  OBJECT_TYPE_METADATA,
} from '../metadata-keys'
import type { ObjectTypeOptions } from '../types'

/**
 * Marks a class as a GraphQL Object Type.
 *
 * @example
 * @ObjectType({ description: 'A cat entity' })
 * class Cat {
 *   @Field(() => ID) id!: string
 *   @Field() name!: string
 * }
 */
export function ObjectType(options: ObjectTypeOptions = {}) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[OBJECT_TYPE_METADATA] = {
      kind: 'object',
      name: options.name ?? target.name,
      description: options.description,
      isAbstract: options.isAbstract ?? false,
    }
    // Inherit fields from parent classes that also carry FIELD_METADATA
    const parentMeta = getParentFieldMeta(target)
    if (parentMeta.length > 0) {
      const existing =
        (context.metadata[FIELD_METADATA] as unknown[] | undefined) ?? []
      const merged = [...parentMeta, ...existing]
      context.metadata[FIELD_METADATA] = merged
    }
  }
}

/**
 * Marks a class as a GraphQL Interface Type.
 *
 * @example
 * @InterfaceType({ description: 'A node with an id' })
 * class Node {
 *   @Field(() => ID) id!: string
 * }
 */
export function InterfaceType(options: ObjectTypeOptions = {}) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[INTERFACE_TYPE_METADATA] = {
      kind: 'interface',
      name: options.name ?? target.name,
      description: options.description,
    }
  }
}

/**
 * Marks a class as a GraphQL Input Type.
 *
 * @example
 * @InputType()
 * class CreateCatInput {
 *   @Field() name!: string
 * }
 */
export function InputType(options: ObjectTypeOptions = {}) {
  return <T extends abstract new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    context.metadata[OBJECT_TYPE_METADATA] = {
      kind: 'input',
      name: options.name ?? target.name,
      description: options.description,
    }
    // Inherit fields from parent classes
    const parentMeta = getParentFieldMeta(target)
    if (parentMeta.length > 0) {
      const existing =
        (context.metadata[FIELD_METADATA] as unknown[] | undefined) ?? []
      const merged = [...parentMeta, ...existing]
      context.metadata[FIELD_METADATA] = merged
    }
  }
}

function getParentFieldMeta(
  target: abstract new (...args: unknown[]) => unknown,
): unknown[] {
  const proto = Object.getPrototypeOf(target) as
    | (abstract new (
        ...args: unknown[]
      ) => unknown)
    | null
  if (!proto || proto === Function.prototype) return []
  const sym = Symbol.metadata
  if (!sym) return []
  const parentSymMeta = (proto as Record<symbol, unknown>)[sym]
  if (!parentSymMeta) return []
  return (
    ((parentSymMeta as Record<symbol, unknown>)[FIELD_METADATA] as
      | unknown[]
      | undefined) ?? []
  )
}
