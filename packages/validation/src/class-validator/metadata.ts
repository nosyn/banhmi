/**
 * Symbol key used to store class-validator rules on a class via TC39 Stage 3
 * decorator context. Read at runtime with:
 *
 * ```ts
 * const meta = (Cls[Symbol.metadata] ?? {})[RULES_KEY]
 * ```
 */
export const RULES_KEY = Symbol('banhmi.class-validator.rules')

/**
 * Every rule kind supported by the built-in class-validator decorators.
 */
export type RuleKind =
  | 'IsString'
  | 'IsEmail'
  | 'IsUUID'
  | 'IsURL'
  | 'IsNotEmpty'
  | 'IsNumber'
  | 'IsInt'
  | 'IsFloat'
  | 'Min'
  | 'Max'
  | 'IsPositive'
  | 'IsNegative'
  | 'IsBoolean'
  | 'IsArray'
  | 'ArrayMinSize'
  | 'ArrayMaxSize'
  | 'IsOptional'
  | 'IsDefined'
  | 'IsIn'
  | 'Matches'
  | 'Length'
  | 'MinLength'
  | 'MaxLength'
  | 'IsEnum'
  | 'IsDate'
  | 'IsObject'
  | 'ValidateNested'

/**
 * A single validation rule attached to a property.
 *
 * @example
 * // Min(10) produces:
 * { kind: 'Min', args: [10] }
 */
export type Rule = {
  kind: RuleKind
  /** Arguments passed to the decorator factory, e.g. `[10]` for `Min(10)`. */
  args?: unknown[]
  /** Optional human-readable message override. */
  message?: string
  /** For ValidateNested — thunk returning the nested class to recurse into. */
  nested?: () => unknown
}

/**
 * Map of property name → list of rules attached to that property.
 */
export type ClassRules = Map<string, Rule[]>

/**
 * Mutate `context.metadata` to append `rule` under the given property name.
 *
 * @internal
 */
export function addRule(
  context: ClassFieldDecoratorContext,
  propName: string,
  rule: Rule,
): void {
  const meta = context.metadata as Record<symbol, unknown>
  const existing = meta[RULES_KEY]
  const map: ClassRules = existing instanceof Map ? existing : new Map()
  const rules = map.get(propName) ?? []
  rules.push(rule)
  map.set(propName, rules)
  meta[RULES_KEY] = map
}
