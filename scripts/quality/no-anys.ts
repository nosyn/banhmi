import { Glob } from 'bun'

export type SourceFile = { path: string; source: string }
export type Violation = { line: number; path: string; snippet: string }

const PATTERNS = [
  /:\s*any\b/g, // `: any`
  /<\s*any\s*>/g, // `<any>`
  /\bas\s+any\b/g, // `as any`
]

const stripComments = (src: string): string =>
  src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

export function findAnyUsages(files: SourceFile[]): Violation[] {
  const out: Violation[] = []
  for (const { path, source } of files) {
    const stripped = stripComments(source)
    const lines = stripped.split('\n')
    lines.forEach((line, i) => {
      for (const pat of PATTERNS) {
        pat.lastIndex = 0
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
  const glob = new Glob('packages/**/src/**/*.ts')
  const files: SourceFile[] = []
  for await (const path of glob.scan({ cwd: process.cwd() })) {
    files.push({ path, source: await Bun.file(path).text() })
  }
  const violations = findAnyUsages(files)
  if (violations.length === 0) {
    console.log('no-anys: clean')
    return 0
  }
  for (const v of violations) {
    console.log(`${v.path}:${v.line}: ${v.snippet}`)
  }
  console.log(`no-anys: ${violations.length} violation(s)`)
  return 1
}

if (import.meta.main) {
  process.exit(await main())
}
