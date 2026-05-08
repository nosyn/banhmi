import { Glob } from 'bun'

/**
 * Strips `//` and `/* *\/` comments while preserving line counts (so
 * violation line numbers stay accurate).
 *
 * Known limitation: `//` inside a string or template literal is treated
 * as the start of a comment, which can mask violations on the same line.
 * Downstream checks (Biome, tsc) catch most of these.
 */
const stripComments = (src) =>
  src
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, (m) =>
      '\n'.repeat((m.match(/\n/g) ?? []).length),
    )
const NON_NULL = /[A-Za-z_$0-9)\]]\s*!\s*[.([]/
/**
 * Find non-null assertion (`!`) usages in TypeScript source files.
 *
 * @example
 * findBangUsages([{ path: 'a.ts', source: 'foo!.bar' }])
 * // → [{ path: 'a.ts', line: 1, snippet: 'foo!.bar' }]
 */
export function findBangUsages(files) {
  const out = []
  for (const { path, source } of files) {
    const stripped = stripComments(source)
    const lines = stripped.split('\n')
    lines.forEach((line, i) => {
      if (NON_NULL.test(line)) {
        out.push({ line: i + 1, path, snippet: line.trim() })
      }
    })
  }
  return out
}
async function main() {
  const glob = new Glob('packages/**/src/**/*.ts')
  const files = []
  for await (const path of glob.scan({ cwd: process.cwd() })) {
    files.push({ path, source: await Bun.file(path).text() })
  }
  if (files.length === 0) {
    console.error(
      'no-bangs: no source files matched — are you running from the repo root?',
    )
    return 1
  }
  const violations = findBangUsages(files)
  if (violations.length === 0) {
    console.log('no-bangs: clean')
    return 0
  }
  for (const v of violations) {
    console.log(`${v.path}:${v.line}: ${v.snippet}`)
  }
  console.log(`no-bangs: ${violations.length} violation(s)`)
  return 1
}
if (import.meta.main) {
  process.exit(await main())
}
