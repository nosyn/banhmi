import { FIELD_METADATA, OBJECT_TYPE_METADATA } from '../metadata-keys'
import type { FieldMeta } from '../types'

type AnyClass = new (...args: unknown[]) => unknown

function getFieldMeta(cls: AnyClass): FieldMeta[] {
  const sym = Symbol.metadata
  if (!sym) return []
  const meta = (cls as Record<symbol, unknown>)[sym] as
    | Record<symbol, unknown>
    | undefined
  if (!meta) return []
  return (meta[FIELD_METADATA] as FieldMeta[] | undefined) ?? []
}

function getTypeMeta(cls: AnyClass): Record<string, unknown> {
  const sym = Symbol.metadata
  if (!sym) return {}
  const meta = (cls as Record<symbol, unknown>)[sym] as
    | Record<symbol, unknown>
    | undefined
  if (!meta) return {}
  return (
    (meta[OBJECT_TYPE_METADATA] as Record<string, unknown> | undefined) ?? {}
  )
}

function buildMappedClass(
  name: string,
  fields: FieldMeta[],
  originalMeta: Record<string, unknown>,
  description?: string,
): AnyClass {
  class MappedType {}
  Object.defineProperty(MappedType, 'name', { value: name })

  // Inject Symbol.metadata
  const sym = Symbol.metadata
  if (sym) {
    const meta: Record<symbol, unknown> = {
      [OBJECT_TYPE_METADATA]: {
        ...(originalMeta ?? {}),
        name,
        description:
          description ?? (originalMeta.description as string | undefined),
      },
      [FIELD_METADATA]: fields,
    }
    Object.defineProperty(MappedType, sym, { value: meta, configurable: true })
  }

  return MappedType
}

/**
 * Creates a new type with all fields of `cls` set to nullable.
 *
 * @example
 * @InputType()
 * class UpdateCatInput extends PartialType(CreateCatInput) {}
 */
export function PartialType(cls: AnyClass): AnyClass {
  const fields = getFieldMeta(cls).map((f) => ({
    ...f,
    options: { ...f.options, nullable: true },
  }))
  const typeMeta = getTypeMeta(cls)
  const name = `Partial${(typeMeta.name as string | undefined) ?? cls.name}`
  return buildMappedClass(name, fields, typeMeta)
}

/**
 * Creates a new type with only the specified fields from `cls`.
 *
 * @example
 * @InputType()
 * class CatNameInput extends PickType(Cat, ['name']) {}
 */
export function PickType<T extends AnyClass, K extends string>(
  cls: T,
  keys: readonly K[],
): AnyClass {
  const keySet = new Set<string>(keys as string[])
  const fields = getFieldMeta(cls).filter((f) => keySet.has(f.propertyKey))
  const typeMeta = getTypeMeta(cls)
  const name = `Pick${(typeMeta.name as string | undefined) ?? cls.name}`
  return buildMappedClass(name, fields, typeMeta)
}

/**
 * Creates a new type excluding the specified fields from `cls`.
 *
 * @example
 * @InputType()
 * class CatWithoutAgeInput extends OmitType(Cat, ['age']) {}
 */
export function OmitType<T extends AnyClass, K extends string>(
  cls: T,
  keys: readonly K[],
): AnyClass {
  const keySet = new Set<string>(keys as string[])
  const fields = getFieldMeta(cls).filter((f) => !keySet.has(f.propertyKey))
  const typeMeta = getTypeMeta(cls)
  const name = `Omit${(typeMeta.name as string | undefined) ?? cls.name}`
  return buildMappedClass(name, fields, typeMeta)
}

/**
 * Creates a new type that merges fields from two types.
 *
 * @example
 * @InputType()
 * class CatDogInput extends IntersectionType(CatInput, DogInput) {}
 */
export function IntersectionType(clsA: AnyClass, clsB: AnyClass): AnyClass {
  const fieldsA = getFieldMeta(clsA)
  const fieldsB = getFieldMeta(clsB)
  const metaA = getTypeMeta(clsA)
  const metaB = getTypeMeta(clsB)
  const nameA = (metaA.name as string | undefined) ?? clsA.name
  const nameB = (metaB.name as string | undefined) ?? clsB.name
  const name = `${nameA}${nameB}`

  // Merge: fieldsB override fieldsA on key conflict
  const fieldMap = new Map<string, FieldMeta>()
  for (const f of fieldsA) fieldMap.set(f.propertyKey, f)
  for (const f of fieldsB) fieldMap.set(f.propertyKey, f)
  const fields = [...fieldMap.values()]

  return buildMappedClass(name, fields, metaA)
}
