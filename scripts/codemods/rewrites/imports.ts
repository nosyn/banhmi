/**
 * Rewrites `@nestjs/*` import paths to their `@banhmi/*` equivalents.
 *
 * @example
 * ```ts
 * import { Module } from '@nestjs/common'
 * // → import { Module } from '@banhmi/common'
 * ```
 */

const PACKAGE_MAP: Record<string, string> = {
  '@nestjs/common': '@banhmi/common',
  '@nestjs/core': '@banhmi/core',
  '@nestjs/swagger': '@banhmi/openapi',
  '@nestjs/config': '@banhmi/config',
  '@nestjs/jwt': '@banhmi/jwt',
  '@nestjs/throttler': '@banhmi/throttler',
  '@nestjs/microservices': '@banhmi/microservices',
  '@nestjs/passport': '@banhmi/auth',
  '@nestjs/schedule': '@banhmi/scheduling',
  '@nestjs/event-emitter': '@banhmi/events',
  '@nestjs/cache-manager': '@banhmi/cache',
  '@nestjs/terminus': '@banhmi/health',
  '@nestjs/serve-static': '@banhmi/static',
}

/**
 * Rewrites all `@nestjs/*` import specifiers in `source` to their
 * `@banhmi/*` equivalents.
 *
 * @param source - TypeScript/JavaScript source text
 * @returns Rewritten source text
 *
 * @example
 * ```ts
 * rewriteImports(`import { Injectable } from '@nestjs/common'`)
 * // → `import { Injectable } from '@banhmi/common'`
 * ```
 */
export function rewriteImports(source: string): string {
  let out = source
  for (const [from, to] of Object.entries(PACKAGE_MAP)) {
    // Match both single and double quoted import specifiers
    const singleQuoted = new RegExp(`from\\s+'${escapeRegExp(from)}'`, 'g')
    const doubleQuoted = new RegExp(`from\\s+"${escapeRegExp(from)}"`, 'g')
    out = out
      .replace(singleQuoted, `from '${to}'`)
      .replace(doubleQuoted, `from "${to}"`)
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
