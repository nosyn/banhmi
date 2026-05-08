/**
 * Names of decorators that already document a property — if any of these
 * appear on a property we skip it.
 * @internal
 */
const SKIP_DECORATORS = ['@ApiProperty', '@ApiHideProperty', '@Exclude']

/**
 * Returns `true` when the trimmed line starts with a decorator that means
 * "this property is already documented, skip it".
 * @internal
 */
function isSkipDecorator(line: string): boolean {
  const t = line.trimStart()
  return SKIP_DECORATORS.some((d) => t.startsWith(d))
}

/**
 * Returns `true` when the line declares a typed class property that we should
 * auto-annotate.
 *
 * Matches: `  name: Type` and `  name?: Type`
 * Skips: `private`, `protected`, `readonly` modifier-prefixed properties,
 *        `#` private fields, static properties, method declarations, and
 *        lines that are not property declarations.
 * @internal
 */
function isAnnotatableProp(line: string): boolean {
  const t = line.trimStart()
  // Skip access modifiers, static, readonly, abstract
  if (/^(private|protected|public\s+static|static|readonly|abstract)\s/.test(t)) return false
  // Skip # private fields
  if (t.startsWith('#')) return false
  // Match `identifier: Type` or `identifier?: Type`
  return /^[A-Za-z_$][A-Za-z0-9_$]*\??\s*:\s*\S/.test(t)
}

/**
 * Transform a TypeScript source string by injecting `@ApiProperty()` decorators
 * before class properties that have an explicit type annotation but are not yet
 * decorated with `@ApiProperty`, `@ApiHideProperty`, or `@Exclude`.
 *
 * The implementation uses a conservative line-walker with a simple brace-depth
 * tracker to stay inside `class` bodies. It does **not** use a full AST, so
 * edge-cases like classes inside template literals are not handled.
 *
 * @param code - The TypeScript source text to transform.
 * @returns The transformed source text.
 *
 * @example
 * transformSource('class A { name: string }')
 * // → 'class A { @ApiProperty() name: string }'
 *
 * @example
 * // Already decorated — unchanged
 * transformSource('class A { @ApiProperty() name: string }')
 * // → 'class A { @ApiProperty() name: string }'
 */
export function transformSource(code: string): string {
  const lines = code.split('\n')
  const out: string[] = []

  // Depth tracking so we only annotate inside class bodies
  let braceDepth = 0
  // classBodyStart[depth] = true means we entered that depth via a class {
  const classBodyDepths = new Set<number>()
  // We look back at preceding lines to detect existing decorators
  let prevNonEmptyWasDecorator = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const t = line.trimStart()

    // Track entering a class body — look for `class Foo {` patterns
    // We need to know if the last `{` we hit was a class opening
    const hasClassKeyword = /\bclass\b/.test(line)

    // Count brace changes on this line
    const opens = (line.match(/{/g) ?? []).length
    const closes = (line.match(/}/g) ?? []).length

    if (opens > 0) {
      if (hasClassKeyword) {
        // Record the depth we're about to enter as a class body
        classBodyDepths.add(braceDepth + 1)
      }
      braceDepth += opens
    }

    const insideClass =
      classBodyDepths.has(braceDepth) && classBodyDepths.size > 0

    // After accounting for opens, check if this line is a property we should annotate
    if (insideClass && isAnnotatableProp(t) && !prevNonEmptyWasDecorator) {
      // Check the already-accumulated output for a skip decorator on the immediately preceding non-empty line
      let lastNonEmpty = ''
      for (let k = out.length - 1; k >= 0; k--) {
        const prev = out[k]
        if (prev !== undefined && prev.trim() !== '') {
          lastNonEmpty = prev
          break
        }
      }
      if (!isSkipDecorator(lastNonEmpty)) {
        // Determine indentation of the property line
        const indent = line.match(/^(\s*)/)?.[1] ?? ''
        out.push(`${indent}@ApiProperty()`)
      }
    }

    out.push(line)

    // Track whether the current non-empty line was a decorator
    if (t !== '') {
      prevNonEmptyWasDecorator = t.startsWith('@')
    }

    if (closes > 0) {
      braceDepth -= closes
      // Remove class body markers for depths we've exited
      for (const d of classBodyDepths) {
        if (d > braceDepth) {
          classBodyDepths.delete(d)
        }
      }
    }
  }

  return out.join('\n')
}
