/**
 * @file nestjs-to-banhmi
 *
 * CLI entry point for the NestJS → Banhmi codemod script.
 *
 * Usage:
 *   bun scripts/codemods/nestjs-to-banhmi.ts '<glob>' [--dry]
 *
 * @example
 * ```bash
 * # Dry-run (print what would change without writing)
 * bun scripts/codemods/nestjs-to-banhmi.ts 'src/**\/*.ts' --dry
 *
 * # Apply all rewrites in place
 * bun scripts/codemods/nestjs-to-banhmi.ts 'src/**\/*.ts'
 * ```
 */

import { Glob } from 'bun'
import { rewriteImports } from './rewrites/imports'
import { rewriteInjectToStatic } from './rewrites/inject-to-static'
import { rewriteSwaggerToOpenapi } from './rewrites/swagger-to-openapi'

export type RewriteFn = (source: string) => string

/** All rewrites applied in order. */
const REWRITES: RewriteFn[] = [
  rewriteImports,
  rewriteInjectToStatic,
  rewriteSwaggerToOpenapi,
]

/**
 * Apply all codemods to a single source string.
 *
 * @param source - Original TypeScript source text
 * @returns Rewritten source text
 *
 * @example
 * ```ts
 * const out = applyAll(`import { Module } from '@nestjs/common'`)
 * // → `import { Module } from '@banhmi/common'`
 * ```
 */
export function applyAll(source: string): string {
  return REWRITES.reduce((acc, fn) => fn(acc), source)
}

function printHelp(): void {
  console.log(
    `
nestjs-to-banhmi — rewrite NestJS source files to Banhmi conventions

Usage:
  bun nestjs-to-banhmi.ts <glob> [--dry]

Options:
  --dry    Print changed files without writing them
  --help   Show this help message

Examples:
  bun nestjs-to-banhmi.ts 'src/**/*.ts' --dry
  bun nestjs-to-banhmi.ts 'src/**/*.ts'
`.trim(),
  )
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    return 0
  }

  const dry = args.includes('--dry')
  const globPattern = args.find((a) => !a.startsWith('--'))

  if (!globPattern) {
    console.error('error: no glob pattern provided')
    printHelp()
    return 1
  }

  const glob = new Glob(globPattern)
  const files: string[] = []
  for await (const path of glob.scan({ cwd: process.cwd() })) {
    files.push(path)
  }

  if (files.length === 0) {
    console.warn(`warn: no files matched pattern "${globPattern}"`)
    return 0
  }

  let changed = 0

  for (const path of files) {
    const original = await Bun.file(path).text()
    const rewritten = applyAll(original)

    if (rewritten === original) continue

    changed++

    if (dry) {
      console.log(`[dry] would rewrite: ${path}`)
    } else {
      await Bun.write(path, rewritten)
      console.log(`rewritten: ${path}`)
    }
  }

  if (changed === 0) {
    console.log('no files needed changes')
  } else if (dry) {
    console.log(
      `\n${changed} file(s) would be rewritten (--dry, no changes written)`,
    )
  } else {
    console.log(`\n${changed} file(s) rewritten`)
  }

  return 0
}

if (import.meta.main) {
  process.exit(await main())
}
