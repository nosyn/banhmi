/**
 * Utilities for sharing models between `@banhmi/openapi` and `@banhmi/graphql`.
 *
 * @remarks
 * This module provides helpers to lift OpenAPI-decorated classes into
 * GraphQL Object Types, avoiding duplication of model definitions.
 *
 * TODO: Full integration with `@banhmi/openapi`'s `generateSdl` requires
 * reading OpenAPI `ApiProperty` metadata and mapping it to GraphQL `@Field`
 * metadata. This is a stub implementation; the full version would inspect
 * the `API_PROPERTY_METADATA` symbol from `@banhmi/openapi` and generate
 * corresponding `FIELD_METADATA` entries. Tracked as a follow-up task.
 */

import { FIELD_METADATA, OBJECT_TYPE_METADATA } from '../metadata-keys'
import type { FieldMeta } from '../types'

type AnyClass = new (...args: unknown[]) => unknown

/**
 * Result of {@link withGraphQLFromOpenApi}.
 */
export interface LiftedGraphQLType {
  /** The generated GraphQL Object Type class. */
  type: AnyClass
  /** The type name. */
  name: string
}

/**
 * Lifts one or more OpenAPI-decorated model classes into GraphQL Object Types.
 *
 * For each class that has `@ApiProperty` metadata, creates a GraphQL type
 * with corresponding `@Field` metadata.
 *
 * @remarks
 * This is a best-effort conversion. Complex OpenAPI types (allOf, anyOf, etc.)
 * are not supported and will be represented as `String` fields.
 *
 * TODO: Implement full @ApiProperty → @Field metadata mapping. Currently
 * only copies already-present FIELD_METADATA (i.e., models that are already
 * decorated with both OpenAPI and GraphQL decorators).
 *
 * @param models - One or more OpenAPI-decorated model classes.
 *
 * @example
 * // A class decorated with both @ApiProperty and @Field:
 * @ObjectType()
 * class Cat {
 *   @ApiProperty({ type: 'string' })
 *   @Field(() => String)
 *   name!: string
 * }
 *
 * const lifted = withGraphQLFromOpenApi([Cat])
 * // lifted[0].type === Cat (already has GraphQL metadata)
 */
export function withGraphQLFromOpenApi(
  models: AnyClass[],
): LiftedGraphQLType[] {
  return models.map((cls) => {
    const sym = Symbol.metadata
    const meta = sym
      ? ((cls as Record<symbol, unknown>)[sym] as
          | Record<symbol, unknown>
          | undefined)
      : undefined

    // If the class already has ObjectType + Field metadata, use it as-is
    if (meta?.[OBJECT_TYPE_METADATA] && meta[FIELD_METADATA]) {
      const typeMeta = meta[OBJECT_TYPE_METADATA] as { name?: string }
      return {
        type: cls,
        name: typeMeta.name ?? cls.name,
      }
    }

    // Minimal stub: create a wrapper class with just ObjectType metadata
    // TODO: Read @ApiProperty metadata and generate @Field entries
    const wrapped = class extends (cls as new () => unknown) {} as AnyClass
    Object.defineProperty(wrapped, 'name', { value: cls.name })

    if (sym) {
      const wrappedMeta: Record<symbol, unknown> = {
        [OBJECT_TYPE_METADATA]: { kind: 'object', name: cls.name },
        [FIELD_METADATA]:
          (meta?.[FIELD_METADATA] as FieldMeta[] | undefined) ?? [],
      }
      Object.defineProperty(wrapped, sym, {
        value: wrappedMeta,
        configurable: true,
      })
    }

    return { type: wrapped, name: cls.name }
  })
}
