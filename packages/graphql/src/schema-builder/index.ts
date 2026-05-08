import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat as GraphQLFloatBuiltin,
  GraphQLID as GraphQLIDBuiltin,
  GraphQLInputObjectType,
  type GraphQLInputType,
  GraphQLInt as GraphQLIntBuiltin,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
} from 'graphql'
import { enumRegistry } from '../decorators/enum-type'
import { Float, ID, Int } from '../decorators/scalars'
import { unionRegistry } from '../decorators/union-type'
import {
  FIELD_METADATA,
  INTERFACE_TYPE_METADATA,
  OBJECT_TYPE_METADATA,
  OPERATIONS_METADATA,
  RESOLVER_METADATA,
} from '../metadata-keys'
import type { FieldMeta, OperationMeta, ResolverMeta } from '../types'
import type { SchemaBuilderConfig } from './types'

type AnyClass = new (...args: unknown[]) => unknown
type AbstractClass = abstract new (...args: unknown[]) => unknown

/**
 * Builds a {@link GraphQLSchema} from classes decorated with `@ObjectType`,
 * `@Resolver`, `@Query`, `@Mutation`, and `@Subscription`.
 *
 * @example
 * const schema = new SchemaBuilder().build([CatResolver], {})
 */
export class SchemaBuilder {
  private typeCache = new Map<
    unknown,
    | GraphQLObjectType
    | GraphQLInputObjectType
    | GraphQLInterfaceType
    | GraphQLEnumType
    | GraphQLUnionType
    | GraphQLScalarType
  >()
  private scalarMap = new Map<string, GraphQLScalarType>()

  /**
   * Build a {@link GraphQLSchema} from the given resolver classes.
   *
   * @param resolverClasses - Resolver class constructors decorated with `@Resolver`.
   * @param instances - Map of resolver class to its instantiated instance.
   * @param config - Optional builder config (extra scalars, etc.).
   */
  build(
    resolverClasses: AnyClass[],
    instances: Map<AnyClass, unknown>,
    config: SchemaBuilderConfig = {},
  ): GraphQLSchema {
    this.resolverInstances = instances

    // Register custom scalars
    for (const scalar of config.scalars ?? []) {
      this.scalarMap.set(scalar.name, scalar)
    }

    const queryFields: Record<string, unknown> = {}
    const mutationFields: Record<string, unknown> = {}
    const subscriptionFields: Record<string, unknown> = {}

    for (const resolverClass of resolverClasses) {
      const meta = this.getClassMeta(resolverClass)
      const resolverMeta = meta[RESOLVER_METADATA] as ResolverMeta | undefined
      if (!resolverMeta) continue

      const operations =
        (meta[OPERATIONS_METADATA] as OperationMeta[] | undefined) ?? []

      for (const op of operations) {
        const instance = instances.get(resolverClass)
        const field = this.buildOperationField(op, resolverClass, instance)

        if (op.kind === 'query') {
          queryFields[op.methodKey] = field
        } else if (op.kind === 'mutation') {
          mutationFields[op.methodKey] = field
        } else if (op.kind === 'subscription') {
          subscriptionFields[op.methodKey] = field
        }
      }
    }

    const schemaConfig: {
      query?: GraphQLObjectType
      mutation?: GraphQLObjectType
      subscription?: GraphQLObjectType
      types: (
        | GraphQLObjectType
        | GraphQLInputObjectType
        | GraphQLInterfaceType
        | GraphQLEnumType
        | GraphQLUnionType
        | GraphQLScalarType
      )[]
    } = { types: [...this.scalarMap.values()] }

    if (Object.keys(queryFields).length > 0) {
      schemaConfig.query = new GraphQLObjectType({
        name: 'Query',
        fields: queryFields as Record<
          string,
          {
            type: GraphQLOutputType
            resolve?: unknown
            description?: string
            args?: Record<
              string,
              { type: GraphQLInputType; description?: string }
            >
          }
        >,
      })
    }

    if (Object.keys(mutationFields).length > 0) {
      schemaConfig.mutation = new GraphQLObjectType({
        name: 'Mutation',
        fields: mutationFields as Record<
          string,
          {
            type: GraphQLOutputType
            resolve?: unknown
            description?: string
            args?: Record<
              string,
              { type: GraphQLInputType; description?: string }
            >
          }
        >,
      })
    }

    if (Object.keys(subscriptionFields).length > 0) {
      schemaConfig.subscription = new GraphQLObjectType({
        name: 'Subscription',
        fields: subscriptionFields as Record<
          string,
          {
            type: GraphQLOutputType
            subscribe?: unknown
            resolve?: unknown
            description?: string
            args?: Record<
              string,
              { type: GraphQLInputType; description?: string }
            >
          }
        >,
      })
    }

    // Add all known types to prevent "unknown type" errors
    for (const t of this.typeCache.values()) {
      if (!schemaConfig.types.includes(t as GraphQLScalarType)) {
        schemaConfig.types.push(t as GraphQLScalarType)
      }
    }

    return new GraphQLSchema(schemaConfig)
  }

  private buildOperationField(
    op: OperationMeta,
    resolverClass: AnyClass,
    instance: unknown,
  ): unknown {
    const returnType = this.resolveOutputType(
      op.typeFn,
      op.options.nullable ?? false,
    )

    const argsDefs: Record<
      string,
      { type: GraphQLInputType; description?: string }
    > = {}

    // First, pick up args from @Arg/@Args parameter metadata
    const argsMeta = this.getOperationArgs(resolverClass, op.methodKey)
    for (const argMeta of argsMeta) {
      const argType = this.resolveInputType(
        argMeta.typeFn,
        argMeta.options.nullable ?? false,
      )
      argsDefs[argMeta.name] = {
        type: argType,
        description: argMeta.options.description,
      }
    }

    // Then, apply inline args from { args: { id: () => String } } in options
    const inlineArgs = op.options.args
    if (inlineArgs) {
      for (const [argName, typeFn] of Object.entries(inlineArgs)) {
        argsDefs[argName] = { type: this.resolveInputType(typeFn, false) }
      }
    }

    if (op.kind === 'subscription') {
      const filterFn = (
        op.options as {
          filter?: (p: unknown, v: Record<string, unknown>) => boolean
        }
      ).filter
      const resolveFn = (op.options as { resolve?: (p: unknown) => unknown })
        .resolve
      return {
        type: returnType,
        args: argsDefs,
        description: op.options.description,
        subscribe: (_root: unknown, args: Record<string, unknown>) => {
          if (!instance) return null
          const method = (
            instance as Record<string, (...a: unknown[]) => unknown>
          )[op.methodKey]
          return method.call(instance, args)
        },
        resolve: resolveFn
          ? (payload: unknown) => resolveFn(payload)
          : (payload: unknown) => payload,
        ...(filterFn
          ? {
              subscribe: (_root: unknown, args: Record<string, unknown>) => {
                if (!instance) return null
                const method = (
                  instance as Record<string, (...a: unknown[]) => unknown>
                )[op.methodKey]
                const iter = method.call(
                  instance,
                  args,
                ) as AsyncIterable<unknown>
                return this.filterAsyncIterable(iter, filterFn, args)
              },
            }
          : {}),
      }
    }

    return {
      type: returnType,
      args: argsDefs,
      description: op.options.description,
      deprecationReason: op.options.deprecationReason,
      resolve: (
        _root: unknown,
        args: Record<string, unknown>,
        context: unknown,
      ) => {
        if (!instance) return null
        const method = (
          instance as Record<string, (...a: unknown[]) => unknown>
        )[op.methodKey]
        return method.call(instance, args, context)
      },
    }
  }

  private async *filterAsyncIterable(
    iter: AsyncIterable<unknown>,
    filter: (payload: unknown, vars: Record<string, unknown>) => boolean,
    vars: Record<string, unknown>,
  ): AsyncIterable<unknown> {
    for await (const item of iter) {
      if (filter(item, vars)) yield item
    }
  }

  private getOperationArgs(
    resolverClass: AnyClass,
    methodKey: string,
  ): {
    name: string
    typeFn: () => unknown
    index: number
    options: FieldMeta['options']
  }[] {
    const meta = this.getClassMeta(resolverClass)
    const byMethod = meta[Symbol.for('graphql:args')] as
      | Record<
          string,
          {
            name: string
            typeFn: () => unknown
            index: number
            options: FieldMeta['options']
          }[]
        >
      | undefined
    return byMethod?.[methodKey] ?? []
  }

  private resolveOutputType(
    typeFn: () => unknown,
    nullable: boolean,
  ): GraphQLOutputType {
    const raw = typeFn()
    const inner = this.mapToGraphQLOutput(raw)
    return nullable ? inner : new GraphQLNonNull(inner)
  }

  private resolveInputType(
    typeFn: () => unknown,
    nullable: boolean,
  ): GraphQLInputType {
    const raw = typeFn()
    const inner = this.mapToGraphQLInput(raw)
    return nullable ? inner : new GraphQLNonNull(inner)
  }

  private mapToGraphQLOutput(raw: unknown): GraphQLOutputType {
    if (raw === String) return GraphQLString
    if (raw === Boolean) return GraphQLBoolean
    if (raw === Number) return GraphQLFloatBuiltin
    if (raw === Int) return GraphQLIntBuiltin
    if (raw === Float) return GraphQLFloatBuiltin
    if (raw === ID) return GraphQLIDBuiltin
    if (raw instanceof GraphQLScalarType) return raw

    // Union sentinel
    if (raw !== null && typeof raw === 'object' && '__unionName' in raw) {
      const unionName = (raw as { __unionName: string }).__unionName
      return this.buildUnionType(unionName)
    }

    // Array type: [T]
    if (Array.isArray(raw) && raw.length === 1) {
      return new GraphQLList(
        new GraphQLNonNull(this.mapToGraphQLOutput(raw[0])),
      )
    }

    // Class reference (ObjectType or InterfaceType)
    if (typeof raw === 'function') {
      return this.buildObjectType(raw as AnyClass)
    }

    // Enum object
    if (typeof raw === 'object' && raw !== null) {
      const enumDef = enumRegistry.get(raw)
      if (enumDef)
        return this.buildEnumType(raw, enumDef.name, enumDef.description)
    }

    return GraphQLString
  }

  private mapToGraphQLInput(raw: unknown): GraphQLInputType {
    if (raw === String) return GraphQLString
    if (raw === Boolean) return GraphQLBoolean
    if (raw === Number) return GraphQLFloatBuiltin
    if (raw === Int) return GraphQLIntBuiltin
    if (raw === Float) return GraphQLFloatBuiltin
    if (raw === ID) return GraphQLIDBuiltin
    if (raw instanceof GraphQLScalarType) return raw

    // Array type: [T]
    if (Array.isArray(raw) && raw.length === 1) {
      return new GraphQLList(new GraphQLNonNull(this.mapToGraphQLInput(raw[0])))
    }

    // Class reference (InputType)
    if (typeof raw === 'function') {
      return this.buildInputObjectType(raw as AnyClass)
    }

    // Enum object
    if (typeof raw === 'object' && raw !== null) {
      const enumDef = enumRegistry.get(raw)
      if (enumDef)
        return this.buildEnumType(raw, enumDef.name, enumDef.description)
    }

    return GraphQLString
  }

  private buildObjectType(
    cls: AnyClass | AbstractClass,
  ): GraphQLObjectType | GraphQLInterfaceType {
    const cached = this.typeCache.get(cls)
    if (
      cached instanceof GraphQLObjectType ||
      cached instanceof GraphQLInterfaceType
    )
      return cached

    const meta = this.getClassMeta(cls as AnyClass)

    // Check if it's an interface type
    const ifaceMeta = meta[INTERFACE_TYPE_METADATA] as
      | { kind: string; name: string; description?: string }
      | undefined
    if (ifaceMeta) {
      const ifaceType = new GraphQLInterfaceType({
        name: ifaceMeta.name,
        description: ifaceMeta.description,
        fields: () => this.buildFieldMap(cls as AnyClass, false),
      })
      this.typeCache.set(cls, ifaceType)
      return ifaceType
    }

    const typeMeta = meta[OBJECT_TYPE_METADATA] as
      | { kind: string; name: string; description?: string }
      | undefined
    const typeName = typeMeta?.name ?? (cls as AnyClass).name

    const objType = new GraphQLObjectType({
      name: typeName,
      description: typeMeta?.description,
      fields: () => this.buildFieldMap(cls as AnyClass, false),
    })
    this.typeCache.set(cls, objType)
    return objType
  }

  private buildInputObjectType(cls: AnyClass): GraphQLInputObjectType {
    const cached = this.typeCache.get(cls)
    if (cached instanceof GraphQLInputObjectType) return cached

    const meta = this.getClassMeta(cls)
    const typeMeta = meta[OBJECT_TYPE_METADATA] as
      | { kind: string; name: string; description?: string }
      | undefined
    const typeName = typeMeta?.name ?? cls.name

    const inputType = new GraphQLInputObjectType({
      name: typeName,
      description: typeMeta?.description,
      fields: () => this.buildFieldMap(cls, true),
    })
    this.typeCache.set(cls, inputType)
    return inputType
  }

  private buildFieldMap(
    cls: AnyClass,
    isInput: boolean,
  ): Record<string, unknown> {
    const meta = this.getClassMeta(cls)
    const fields = (meta[FIELD_METADATA] as FieldMeta[] | undefined) ?? []

    const fieldMap: Record<string, unknown> = {}
    for (const f of fields) {
      const type = isInput
        ? this.resolveInputType(f.typeFn, f.options.nullable ?? false)
        : this.resolveOutputType(f.typeFn, f.options.nullable ?? false)
      fieldMap[f.propertyKey] = {
        type,
        description: f.options.description,
        deprecationReason: f.options.deprecationReason,
      }
    }
    return fieldMap
  }

  private buildEnumType(
    enumObj: object,
    name: string,
    description?: string,
  ): GraphQLEnumType {
    const cached = this.typeCache.get(enumObj)
    if (cached instanceof GraphQLEnumType) return cached

    const values: Record<string, { value: unknown }> = {}
    for (const [key, value] of Object.entries(
      enumObj as Record<string, unknown>,
    )) {
      if (typeof value !== 'function') {
        values[key] = { value }
      }
    }

    const enumType = new GraphQLEnumType({ name, description, values })
    this.typeCache.set(enumObj, enumType)
    return enumType
  }

  private buildUnionType(name: string): GraphQLUnionType {
    const existing = this.typeCache.get(name)
    if (existing instanceof GraphQLUnionType) return existing

    const def = unionRegistry.get(name)
    if (!def) {
      throw new Error(
        `Union type "${name}" not registered. Call createUnionType() first.`,
      )
    }

    const unionType = new GraphQLUnionType({
      name: def.name,
      description: def.description,
      types: () =>
        def.types().map((t) => this.buildObjectType(t) as GraphQLObjectType),
      resolveType: def.resolveType
        ? (value) => def.resolveType?.(value) ?? null
        : undefined,
    })
    this.typeCache.set(name, unionType)
    return unionType
  }

  private getClassMeta(cls: AnyClass | AbstractClass): Record<symbol, unknown> {
    const sym = Symbol.metadata
    if (!sym) return {}
    const raw = (cls as Record<symbol, unknown>)[sym]
    return (raw as Record<symbol, unknown>) ?? {}
  }
}
