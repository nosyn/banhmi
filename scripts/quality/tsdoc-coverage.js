import { Glob } from 'bun'

const EXPORT_DECL =
  /^\s*export\s+(?:async\s+|default\s+)?(function|class|const|let|var|interface)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
/**
 * Find exported declarations in a TypeScript file that lack TSDoc immediately
 * above them. A declaration is considered documented if the previous non-blank
 * line ends with `*\/` (i.e., closes a `/** … *\/` block).
 *
 * Skipped:
 * - `export type X = …` (types are documented at the use site)
 * - re-exports (`export { x } from …`, `export * from …`)
 *
 * @example
 * findUndocumentedExports([{ path: 'a.ts', source: 'export function foo() {}' }])
 * // → [{ path: 'a.ts', line: 1, name: 'foo' }]
 */
export function findUndocumentedExports(files) {
  const out = []
  for (const { path, source } of files) {
    const lines = source.split('\n')
    lines.forEach((line, i) => {
      const m = line.match(EXPORT_DECL)
      if (!m) return
      const name = m[2]
      if (!name) return
      let prev = i - 1
      while (prev >= 0 && lines[prev].trim() === '') prev--
      const prevLine = (lines[prev] ?? '').trim()
      const docOk = prevLine.endsWith('*/')
      if (!docOk) {
        out.push({ line: i + 1, name, path })
      }
    })
  }
  return out
}
async function main() {
  const glob = new Glob('packages/*/src/index.ts')
  const files = []
  for await (const path of glob.scan({ cwd: process.cwd() })) {
    files.push({ path, source: await Bun.file(path).text() })
  }
  if (files.length === 0) {
    console.error(
      'tsdoc-coverage: no source files matched — are you running from the repo root?',
    )
    return 1
  }
  const violations = findUndocumentedExports(files)
  if (violations.length === 0) {
    console.log('tsdoc-coverage: clean')
    return 0
  }
  for (const v of violations) {
    console.log(`${v.path}:${v.line}: missing TSDoc for ${v.name}`)
  }
  console.log(`tsdoc-coverage: ${violations.length} violation(s)`)
  return 1
}
if (import.meta.main) {
  process.exit(await main())
}
