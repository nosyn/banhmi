import { Glob } from 'bun'

export type SourceFile = { path: string; source: string }
export type Violation = { line: number; path: string; snippet: string }

/**
 * Strips `//` and `/* *\/` comments while preserving line counts (so
 * violation line numbers stay accurate).
 *
 * Known limitation: a `//` inside a string or template literal is treated
 * as the start of a comment, which can mask violations on the same line.
 * Downstream checks (Biome, tsc) catch most of these. Pinned tests document
 * the current behaviour.
 */
const stripComments = (src: string): string =>
  src
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, (m) =>
      '\n'.repeat((m.match(/\n/g) ?? []).length),
    )

const PATTERNS = [
  /import\s+['"]reflect-metadata['"]/,
  /from\s+['"]reflect-metadata['"]/,
  /require\(\s*['"]reflect-metadata['"]\s*\)/,
]

/**
 * Find imports of the forbidden `reflect-metadata` package.
 *
 * @example
 * findReflectMetadataImports([{ path: 'a.ts', source: "import 'reflect-metadata'" }])
 * // → [{ path: 'a.ts', line: 1, snippet: "import 'reflect-metadata'" }]
 */
export function findReflectMetadataImports(files: SourceFile[]): Violation[] {
  const out: Violation[] = []
  for (const { path, source } of files) {
    const stripped = stripComments(source)
    const lines = stripped.split('\n')
    lines.forEach((line, i) => {
      for (const pat of PATTERNS) {
        if (pat.test(line)) {
          out.push({ line: i + 1, path, snippet: line.trim() })
          break
        }
      }
    })
  }
  return out
}

async function main(): Promise<number> {
  // Scan packages, examples, and apps. Intentionally excludes benchmarks/competitors
  // because NestJS competitor apps legitimately depend on reflect-metadata.
  const glob = new Glob('{packages,examples,apps}/**/*.{ts,tsx}')
  const files: SourceFile[] = []
  for await (const path of glob.scan({ cwd: process.cwd() })) {
    files.push({ path, source: await Bun.file(path).text() })
  }
  if (files.length === 0) {
    console.error(
      'no-reflect: no source files matched — are you running from the repo root?',
    )
    return 1
  }
  const violations = findReflectMetadataImports(files)
  if (violations.length === 0) {
    console.log('no-reflect: clean')
    return 0
  }
  for (const v of violations) {
    console.log(`${v.path}:${v.line}: ${v.snippet}`)
  }
  console.log(`no-reflect: ${violations.length} violation(s)`)
  return 1
}

if (import.meta.main) {
  process.exit(await main())
}
