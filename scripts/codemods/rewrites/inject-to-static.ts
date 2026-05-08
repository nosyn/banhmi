/**
 * Rewrites `@Inject(TOKEN) private foo: T` constructor parameters to the
 * Banhmi `static inject = [...] as const` class-level pattern.
 *
 * @example
 * ```ts
 * // Before
 * constructor(@Inject(MY_TOKEN) private foo: T) {}
 *
 * // After
 * static inject = [MY_TOKEN] as const
 * constructor(private foo: T) {}
 * ```
 */

/**
 * Extracts the balanced-parentheses token inside `@Inject(...)`.
 * Returns [tokenExpr, endIndex] where endIndex is the position after the
 * closing `)`, or null if src[pos..] does not start with `@Inject(`.
 */
function extractInjectToken(
  src: string,
  pos: number,
): [string, number] | null {
  if (src.slice(pos, pos + 8) !== '@Inject(') return null
  let depth = 0
  let i = pos + 7 // points at '('
  while (i < src.length) {
    if (src[i] === '(') depth++
    else if (src[i] === ')') {
      depth--
      if (depth === 0) return [src.slice(pos + 8, i), i + 1]
    }
    i++
  }
  return null
}

/**
 * Finds the matching `)` for the `(` at `src[openPos]`.
 * Returns the index of the matching `)`.
 */
function findClosingParen(src: string, openPos: number): number {
  let depth = 0
  for (let i = openPos; i < src.length; i++) {
    if (src[i] === '(') depth++
    else if (src[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return src.length - 1
}

/**
 * Rewrites `@Inject(TOKEN) param` constructor arguments to
 * `static inject = [...] as const` on the class body.
 *
 * @param source - TypeScript source text
 * @returns Rewritten source text
 *
 * @example
 * ```ts
 * rewriteInjectToStatic(
 *   `class Svc {\n  constructor(@Inject(T) private t: T) {}\n}`
 * )
 * // → `class Svc {\n  static inject = [T] as const\n  constructor(private t: T) {}\n}`
 * ```
 */
export function rewriteInjectToStatic(source: string): string {
  // Find every `constructor(` occurrence regardless of position
  const CTOR_RE = /\bconstructor\s*\(/g
  let out = source

  let match: RegExpExecArray | null
  while ((match = CTOR_RE.exec(out)) !== null) {
    const parenStart = match.index + match[0].length - 1 // index of '('
    const parenEnd = findClosingParen(out, parenStart)
    const paramBlock = out.slice(parenStart + 1, parenEnd)

    if (!/@Inject\(/.test(paramBlock)) continue

    // Collect @Inject tokens and build a clean param block
    const tokens: string[] = []
    let cleanBlock = ''
    let j = 0
    while (j < paramBlock.length) {
      const absPos = parenStart + 1 + j
      if (out.slice(absPos, absPos + 8) === '@Inject(') {
        const result = extractInjectToken(out, absPos)
        if (result !== null) {
          const [token, endAbs] = result
          tokens.push(token.trim())
          // Advance j past the @Inject(...) span
          j = endAbs - (parenStart + 1)
          // Skip one whitespace character that separates the decorator from
          // the parameter name
          if (j < paramBlock.length && /\s/.test(paramBlock[j] ?? '')) j++
          continue
        }
      }
      cleanBlock += paramBlock[j]
      j++
    }

    if (tokens.length === 0) continue

    // Determine indentation: look backwards for the start of the constructor line
    let lineStart = match.index
    while (lineStart > 0 && out[lineStart - 1] !== '\n') lineStart--
    const indent = out.slice(lineStart, match.index).match(/^[ \t]*/)?.[0] ?? ''

    const staticLine = `${indent}static inject = [${tokens.join(', ')}] as const`
    const ctorStart = match.index
    const ctorKeyword = `constructor(`
    const newCtor = `${staticLine}\n${indent}${ctorKeyword}${cleanBlock})`

    out = out.slice(0, ctorStart) + newCtor + out.slice(parenEnd + 1)

    // Restart after the newly inserted block
    CTOR_RE.lastIndex = ctorStart + newCtor.length
  }

  // Remove @Inject from the import list when no usages remain
  if (!/@Inject\(/.test(out)) {
    out = removeNamedImport(out, 'Inject')
  }

  return out
}

/**
 * Removes a named export from an import statement while leaving other
 * named exports intact.
 *
 * Examples:
 *  `{ Injectable, Inject }` → `{ Injectable }`
 *  `{ Inject, Injectable }` → `{ Injectable }`
 *  `{ Inject }` → `{}`
 */
function removeNamedImport(source: string, name: string): string {
  // `, Name` at end of list
  let out = source.replace(new RegExp(`,\\s*\\b${name}\\b`, 'g'), '')
  // `Name, ` at start of list
  out = out.replace(new RegExp(`\\b${name}\\b\\s*,\\s*`, 'g'), '')
  // `{ Name }` sole entry
  out = out.replace(new RegExp(`\\{\\s*\\b${name}\\b\\s*\\}`, 'g'), '{}')
  return out
}
