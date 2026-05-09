import { Glob } from 'bun'

export type SourceFile = { path: string; source: string } // unused but keep for parity
export type Violation = { path: string; reason: string }

/**
 * Find committed `.js` / `.d.ts` files that shadow a `.ts` or `.tsx` source.
 *
 * @example
 * findShadowJs(['packages/x/src/a.ts', 'packages/x/src/a.js'])
 * // → [{ path: 'packages/x/src/a.js', reason: 'shadows packages/x/src/a.ts' }]
 */
export function findShadowJs(paths: string[]): Violation[] {
  const tsSet = new Set(
    paths.filter((p) => p.endsWith('.ts') || p.endsWith('.tsx')),
  )
  const out: Violation[] = []
  for (const p of paths) {
    if (
      p.endsWith('.js') ||
      p.endsWith('.d.ts') ||
      p.endsWith('.js.map') ||
      p.endsWith('.d.ts.map')
    ) {
      const base = p.replace(/\.(js|js\.map|d\.ts|d\.ts\.map)$/, '')
      const ts = `${base}.ts`
      const tsx = `${base}.tsx`
      if (tsSet.has(ts) || tsSet.has(tsx)) {
        out.push({ path: p, reason: `shadows ${tsSet.has(ts) ? ts : tsx}` })
      }
    }
  }
  return out
}

async function main(): Promise<number> {
  const glob = new Glob(
    '{packages,examples,apps,benchmarks,scripts}/**/*.{ts,tsx,js,d.ts}',
  )
  const paths: string[] = []
  for await (const p of glob.scan({ cwd: process.cwd() })) {
    paths.push(p)
  }
  if (paths.length === 0) {
    console.error(
      'no-shadow-js: no source files matched — are you running from the repo root?',
    )
    return 1
  }
  const violations = findShadowJs(paths)
  if (violations.length === 0) {
    console.log('no-shadow-js: clean')
    return 0
  }
  for (const v of violations) {
    console.log(`${v.path}: ${v.reason}`)
  }
  console.log(`no-shadow-js: ${violations.length} violation(s)`)
  return 1
}

if (import.meta.main) {
  process.exit(await main())
}
