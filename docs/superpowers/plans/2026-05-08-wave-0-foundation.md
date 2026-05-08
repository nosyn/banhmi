# Wave 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the scaffolding that the next 12 waves of the Banhmi Supremacy effort rely on: doc routes, MDX content pipeline, examples template, quality scripts, benchmark harness, CI matrix, codex coordination harness, agent prompt template.

**Architecture:** Land all foundation pieces as small, independent commits behind a single verification gate. Most tasks touch disjoint files and can be parallelised; the doc-route wiring depends on the MDX plugin being in place. Each task is TDD where applicable; bulk content tasks have explicit verification commands. Final task runs the wave-0 gate (`bun test --recursive`, `bun run lint`, `bun run docs:build`, `bun run benchmarks:smoke`, the four quality scripts).

**Tech Stack:** Bun, TypeScript, Biome 2.4.10, TanStack Start (Vite + Nitro + React 19), `@mdx-js/rollup`, `oha` for benchmarking, GitHub Actions for CI.

**Cross-task conventions:**
- Run all `bun` and `git` commands from the repo root: `/Users/nosyn/personal/banhmi`.
- Tests use `bun test` (never Jest/Vitest).
- No `reflect-metadata`, no `experimentalDecorators`, no `any`, no `!`.
- Biome quote style is single, no semicolons, trailing commas. Run `bun run format` before committing.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `build:`, `ci:`).

---

## Section A — Quality Scripts

### Task 1: `no-anys.ts` quality script

**Files:**
- Create: `scripts/quality/no-anys.ts`
- Test: `scripts/quality/no-anys.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/quality/no-anys.test.ts
import { test, expect } from 'bun:test'
import { findAnyUsages } from './no-anys'

test('flags `: any` in TS source', () => {
  const violations = findAnyUsages([
    { path: 'a.ts', source: 'function f(x: any): void {}' },
  ])
  expect(violations).toHaveLength(1)
  expect(violations[0].path).toBe('a.ts')
})

test('flags `<any>` cast', () => {
  const violations = findAnyUsages([
    { path: 'b.ts', source: "const x = <any>foo" },
  ])
  expect(violations).toHaveLength(1)
})

test('flags `as any`', () => {
  const violations = findAnyUsages([
    { path: 'c.ts', source: 'const x = foo as any' },
  ])
  expect(violations).toHaveLength(1)
})

test('does not flag the literal substring `Cany` (word-boundary safe)', () => {
  const violations = findAnyUsages([
    { path: 'd.ts', source: 'const Cany = 1' },
  ])
  expect(violations).toHaveLength(0)
})

test('ignores comments', () => {
  const violations = findAnyUsages([
    { path: 'e.ts', source: '// this is any text' },
  ])
  expect(violations).toHaveLength(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test scripts/quality/no-anys.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the script**

```ts
// scripts/quality/no-anys.ts
import { Glob } from 'bun'

export type SourceFile = { path: string; source: string }
export type Violation = { path: string; line: number; snippet: string }

const PATTERNS = [
  /(?<![A-Za-z_$])(:\s*any)\b/g, // `: any`
  /<\s*any\s*>/g,                  // `<any>`
  /\bas\s+any\b/g,                 // `as any`
]

const stripComments = (src: string): string =>
  src
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

export function findAnyUsages(files: SourceFile[]): Violation[] {
  const out: Violation[] = []
  for (const { path, source } of files) {
    const stripped = stripComments(source)
    const lines = stripped.split('\n')
    lines.forEach((line, i) => {
      for (const pat of PATTERNS) {
        pat.lastIndex = 0
        if (pat.test(line)) {
          out.push({ path, line: i + 1, snippet: line.trim() })
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test scripts/quality/no-anys.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/quality/no-anys.ts scripts/quality/no-anys.test.ts
git commit -m "feat(quality): add no-anys quality script"
```

---

### Task 2: `no-bangs.ts` quality script

**Files:**
- Create: `scripts/quality/no-bangs.ts`
- Test: `scripts/quality/no-bangs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/quality/no-bangs.test.ts
import { test, expect } from 'bun:test'
import { findBangUsages } from './no-bangs'

test('flags `foo!.bar`', () => {
  const violations = findBangUsages([{ path: 'a.ts', source: 'foo!.bar' }])
  expect(violations).toHaveLength(1)
})

test('flags `foo!()`', () => {
  const violations = findBangUsages([{ path: 'b.ts', source: 'foo!()' }])
  expect(violations).toHaveLength(1)
})

test('does not flag `!=`', () => {
  const violations = findBangUsages([{ path: 'c.ts', source: 'a != b' }])
  expect(violations).toHaveLength(0)
})

test('does not flag `!foo`', () => {
  const violations = findBangUsages([{ path: 'd.ts', source: 'if (!foo)' }])
  expect(violations).toHaveLength(0)
})

test('ignores comments', () => {
  const violations = findBangUsages([
    { path: 'e.ts', source: '// foo!.bar' },
  ])
  expect(violations).toHaveLength(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test scripts/quality/no-bangs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the script**

```ts
// scripts/quality/no-bangs.ts
import { Glob } from 'bun'

export type SourceFile = { path: string; source: string }
export type Violation = { path: string; line: number; snippet: string }

const stripComments = (src: string): string =>
  src
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

const NON_NULL = /[A-Za-z_$0-9\)\]]\s*!\s*[\.\(\[]/

export function findBangUsages(files: SourceFile[]): Violation[] {
  const out: Violation[] = []
  for (const { path, source } of files) {
    const stripped = stripComments(source)
    const lines = stripped.split('\n')
    lines.forEach((line, i) => {
      if (NON_NULL.test(line)) {
        out.push({ path, line: i + 1, snippet: line.trim() })
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test scripts/quality/no-bangs.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/quality/no-bangs.ts scripts/quality/no-bangs.test.ts
git commit -m "feat(quality): add no-bangs quality script"
```

---

### Task 3: `no-reflect.ts` quality script

**Files:**
- Create: `scripts/quality/no-reflect.ts`
- Test: `scripts/quality/no-reflect.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/quality/no-reflect.test.ts
import { test, expect } from 'bun:test'
import { findReflectMetadataImports } from './no-reflect'

test('flags `import "reflect-metadata"`', () => {
  const v = findReflectMetadataImports([
    { path: 'a.ts', source: "import 'reflect-metadata'" },
  ])
  expect(v).toHaveLength(1)
})

test('flags `from "reflect-metadata"`', () => {
  const v = findReflectMetadataImports([
    { path: 'b.ts', source: "import x from 'reflect-metadata'" },
  ])
  expect(v).toHaveLength(1)
})

test('flags `require("reflect-metadata")`', () => {
  const v = findReflectMetadataImports([
    { path: 'c.ts', source: "const x = require('reflect-metadata')" },
  ])
  expect(v).toHaveLength(1)
})

test('does not flag the substring in a comment', () => {
  const v = findReflectMetadataImports([
    { path: 'd.ts', source: "// reflect-metadata is forbidden" },
  ])
  expect(v).toHaveLength(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test scripts/quality/no-reflect.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the script**

```ts
// scripts/quality/no-reflect.ts
import { Glob } from 'bun'

export type SourceFile = { path: string; source: string }
export type Violation = { path: string; line: number; snippet: string }

const stripComments = (src: string): string =>
  src
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

const PATTERNS = [
  /import\s+['"]reflect-metadata['"]/,
  /from\s+['"]reflect-metadata['"]/,
  /require\(\s*['"]reflect-metadata['"]\s*\)/,
]

export function findReflectMetadataImports(files: SourceFile[]): Violation[] {
  const out: Violation[] = []
  for (const { path, source } of files) {
    const stripped = stripComments(source)
    const lines = stripped.split('\n')
    lines.forEach((line, i) => {
      for (const pat of PATTERNS) {
        if (pat.test(line)) {
          out.push({ path, line: i + 1, snippet: line.trim() })
          break
        }
      }
    })
  }
  return out
}

async function main(): Promise<number> {
  const glob = new Glob('{packages,examples,apps,benchmarks}/**/*.{ts,tsx}')
  const files: SourceFile[] = []
  for await (const path of glob.scan({ cwd: process.cwd() })) {
    files.push({ path, source: await Bun.file(path).text() })
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test scripts/quality/no-reflect.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/quality/no-reflect.ts scripts/quality/no-reflect.test.ts
git commit -m "feat(quality): add no-reflect quality script"
```

---

### Task 4: `tsdoc-coverage.ts` quality script

**Files:**
- Create: `scripts/quality/tsdoc-coverage.ts`
- Test: `scripts/quality/tsdoc-coverage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/quality/tsdoc-coverage.test.ts
import { test, expect } from 'bun:test'
import { findUndocumentedExports } from './tsdoc-coverage'

test('flags exported function with no TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'a.ts', source: 'export function foo() {}' },
  ])
  expect(v).toHaveLength(1)
  expect(v[0].name).toBe('foo')
})

test('passes exported function with TSDoc above it', () => {
  const v = findUndocumentedExports([
    {
      path: 'b.ts',
      source: '/**\n * Says hi\n */\nexport function foo() {}',
    },
  ])
  expect(v).toHaveLength(0)
})

test('flags exported class with no TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'c.ts', source: 'export class Foo {}' },
  ])
  expect(v).toHaveLength(1)
})

test('passes exported class with TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'd.ts', source: '/** doc */\nexport class Foo {}' },
  ])
  expect(v).toHaveLength(0)
})

test('flags `export const X = ...` without TSDoc', () => {
  const v = findUndocumentedExports([
    { path: 'e.ts', source: 'export const Foo = 1' },
  ])
  expect(v).toHaveLength(1)
})

test('does not flag `export type` (types may be doc'd at site of use)', () => {
  const v = findUndocumentedExports([
    { path: 'f.ts', source: 'export type Foo = string' },
  ])
  expect(v).toHaveLength(0)
})

test('does not flag re-exports', () => {
  const v = findUndocumentedExports([
    { path: 'g.ts', source: "export { foo } from './bar'" },
  ])
  expect(v).toHaveLength(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test scripts/quality/tsdoc-coverage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the script**

```ts
// scripts/quality/tsdoc-coverage.ts
import { Glob } from 'bun'

export type SourceFile = { path: string; source: string }
export type Violation = { path: string; line: number; name: string }

const EXPORT_DECL = /^\s*export\s+(?:async\s+|default\s+)?(function|class|const|let|var|interface)\s+([A-Za-z_$][A-Za-z0-9_$]*)/

export function findUndocumentedExports(files: SourceFile[]): Violation[] {
  const out: Violation[] = []
  for (const { path, source } of files) {
    const lines = source.split('\n')
    lines.forEach((line, i) => {
      const m = line.match(EXPORT_DECL)
      if (!m) return
      const [, , name] = m
      if (!name) return
      let prev = i - 1
      while (prev >= 0 && lines[prev].trim() === '') prev--
      const prevLine = (lines[prev] ?? '').trim()
      const docOk = prevLine.endsWith('*/')
      if (!docOk) {
        out.push({ path, line: i + 1, name })
      }
    })
  }
  return out
}

async function main(): Promise<number> {
  const glob = new Glob('packages/*/src/index.ts')
  const files: SourceFile[] = []
  for await (const path of glob.scan({ cwd: process.cwd() })) {
    files.push({ path, source: await Bun.file(path).text() })
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test scripts/quality/tsdoc-coverage.test.ts`
Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/quality/tsdoc-coverage.ts scripts/quality/tsdoc-coverage.test.ts
git commit -m "feat(quality): add tsdoc-coverage quality script"
```

---

### Task 5: Wire quality scripts into root `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read the current root package.json**

Run: `cat package.json`
Expected output: existing JSON shown earlier (workspaces, build, test, lint, format scripts).

- [ ] **Step 2: Add the quality scripts**

Update `package.json` so `scripts` reads:

```json
"scripts": {
  "build": "bun run --filter='*' build",
  "test": "bun test --recursive",
  "lint": "biome check .",
  "format": "biome format --write .",
  "quality:no-anys": "bun run scripts/quality/no-anys.ts",
  "quality:no-bangs": "bun run scripts/quality/no-bangs.ts",
  "quality:no-reflect": "bun run scripts/quality/no-reflect.ts",
  "quality:tsdoc": "bun run scripts/quality/tsdoc-coverage.ts",
  "quality": "bun run quality:no-anys && bun run quality:no-bangs && bun run quality:no-reflect && bun run quality:tsdoc",
  "typecheck": "tsc -b --pretty"
}
```

(Use `Edit` with the full `scripts` block as `old_string`/`new_string` to keep formatting deterministic.)

- [ ] **Step 3: Verify it parses and quality runs against current tree**

Run: `bun run quality`
Expected: each script reports `clean` (current `packages/**/src` should be clean already; if any flag, fix in this commit).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: wire quality scripts into root package.json"
```

---

## Section B — Examples Template

### Task 6: Reference template under `examples/features/.template/`

**Files:**
- Create: `examples/features/.template/index.ts`
- Create: `examples/features/.template/feature.test.ts`
- Create: `examples/features/.template/README.md`
- Create: `examples/features/.template/package.json`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@banhmi-feature/.template",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "dependencies": {
    "banhmi": "workspace:*",
    "@banhmi/testing": "workspace:*"
  }
}
```

- [ ] **Step 2: Write `index.ts`**

```ts
// examples/features/.template/index.ts
// Single-file demo. Replace this comment with a one-line description of the feature.
import { Module, Controller, Get } from 'banhmi'

@Controller()
export class HelloController {
  @Get('/')
  hello() {
    return { ok: true }
  }
}

@Module({ controllers: [HelloController] })
export class AppModule {}
```

- [ ] **Step 3: Write `feature.test.ts`**

```ts
// examples/features/.template/feature.test.ts
import { test, expect } from 'bun:test'
import { Test } from '@banhmi/testing'
import { AppModule } from './index'

test('template: GET / returns ok', async () => {
  const app = await Test.createApplication(AppModule)
  await app.listen({ port: 0 })
  const url = app.getUrl()
  const res = await fetch(`${url}/`)
  expect(res.status).toBe(200)
  await app.close()
})
```

- [ ] **Step 4: Write `README.md`**

```markdown
# Feature Template

Copy this directory to `examples/features/<your-slug>/` to start a new feature example.

- `index.ts` — single-file demo, importable by tests and rendered into MDX docs via `<CodeFromExample slug="<slug>" />`.
- `feature.test.ts` — integration test asserting behaviour.
- `package.json` — keep dependencies minimal; `banhmi` and `@banhmi/testing` cover most cases.

A feature is **not done** until both the demo and the test are committed and `bun test` is green.
```

- [ ] **Step 5: Verify the test passes against current Banhmi**

Run: `bun test examples/features/.template/feature.test.ts`
Expected: 1 PASS. (If `Test.createApplication` does not exist with this exact shape, look at `packages/testing/src/testing-module.ts` and adjust the example to match the actual API; do **not** invent APIs.)

- [ ] **Step 6: Commit**

```bash
git add examples/features/.template
git commit -m "feat(examples): add features/.template reference structure"
```

---

## Section C — Codex Coordination & Agent Prompt Template

### Task 7: Feature-agent prompt template

**Files:**
- Create: `docs/superpowers/templates/feature-agent-prompt.md`

- [ ] **Step 1: Write the template**

```markdown
# Feature Implementation Agent Prompt

> Used by the master orchestrator to dispatch a Claude agent for a single feature.

## Context

- Repository: `/Users/nosyn/personal/banhmi`
- Wave spec: `<WAVE_SPEC_PATH>`
- Wave plan: `<WAVE_PLAN_PATH>`
- Package skeleton: `<PACKAGE_PATH>`
- NestJS reference URL: `<NESTJS_DOC_URL>`
- Example template directory: `examples/features/.template/`
- Feature slug: `<FEATURE_SLUG>`

## Task

Implement the feature listed in the wave plan under `### Feature: <FEATURE_SLUG>`. Concretely:

1. Implement the feature in `<PACKAGE_PATH>/src/`. Follow existing decorator/DI conventions in the repo (TC39 Stage 3, `Symbol.metadata`, `static inject`).
2. Write tests in `<PACKAGE_PATH>/test/`. Achieve ≥ 90% line coverage.
3. Create a micro-example at `examples/features/<FEATURE_SLUG>/`:
   - `index.ts`: single-file runnable demo
   - `feature.test.ts`: integration test
   - `README.md`: 1-paragraph description
   - `package.json`: workspace `banhmi` + `@banhmi/testing`
4. Author the doc page at `apps/docs/apps/web/src/content/<topic>/<FEATURE_SLUG>.mdx` using the standard template (see Section 11.4 of the master spec). Pull the code via `<CodeFromExample slug="<FEATURE_SLUG>" />`.
5. Add a benchmark scenario at `benchmarks/scenarios/<FEATURE_SLUG>/` if the feature has user-facing perf characteristics.

## Quality bars (enforced)

- `bun test` green for the package and the micro-example.
- `bun run lint` clean.
- `bun run quality` (`no-anys`, `no-bangs`, `no-reflect`, `tsdoc-coverage`) clean.
- TSDoc on every public symbol, with at least one `@example`.
- No `reflect-metadata`, no `experimentalDecorators`.
- No `process.env` in platform code (use `Bun.env`).

## Verification

Before reporting completion, run:

```bash
cd /Users/nosyn/personal/banhmi
bun test --recursive
bun run lint
bun run quality
bun run docs:build
```

All four must succeed.

## Report

Reply with: a list of files added/changed, the test count and pass status, the lint/quality/docs:build status, and any deviations from the wave plan.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/templates/feature-agent-prompt.md
git commit -m "docs(templates): add feature-agent prompt template"
```

---

### Task 8: Codex coordination harness

**Files:**
- Create: `scripts/codex/queue.ts`
- Create: `scripts/codex/queue.test.ts`
- Create: `scripts/codex/README.md`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/codex/queue.test.ts
import { test, expect } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CodexQueue } from './queue'

test('enqueue persists tasks to disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'codex-'))
  try {
    const q = new CodexQueue(join(dir, 'queue.json'))
    q.enqueue({ id: 't1', prompt: 'do thing', kind: 'scaffold' })
    expect(q.list()).toHaveLength(1)
    expect(q.list()[0].id).toBe('t1')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('reload reads persisted state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'codex-'))
  try {
    const path = join(dir, 'queue.json')
    const a = new CodexQueue(path)
    a.enqueue({ id: 't1', prompt: 'do thing', kind: 'scaffold' })
    const b = new CodexQueue(path)
    expect(b.list()).toHaveLength(1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('markDone removes the task', () => {
  const dir = mkdtempSync(join(tmpdir(), 'codex-'))
  try {
    const q = new CodexQueue(join(dir, 'queue.json'))
    q.enqueue({ id: 't1', prompt: 'do thing', kind: 'scaffold' })
    q.markDone('t1')
    expect(q.list()).toHaveLength(0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test scripts/codex/queue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// scripts/codex/queue.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export type CodexTask = {
  id: string
  prompt: string
  kind: 'scaffold' | 'docs' | 'rename' | 'wiring'
}

/**
 * File-backed queue of cookie-cutter work that the master orchestrator hands
 * off to a Codex agent. Persisted as a JSON array on disk.
 *
 * @example
 * const q = new CodexQueue('codex.queue.json')
 * q.enqueue({ id: 'scaffold-middleware', prompt: '...', kind: 'scaffold' })
 */
export class CodexQueue {
  constructor(private readonly path: string) {}

  list(): CodexTask[] {
    if (!existsSync(this.path)) return []
    return JSON.parse(readFileSync(this.path, 'utf8')) as CodexTask[]
  }

  enqueue(task: CodexTask): void {
    const tasks = this.list()
    tasks.push(task)
    writeFileSync(this.path, JSON.stringify(tasks, null, 2))
  }

  markDone(id: string): void {
    const tasks = this.list().filter((t) => t.id !== id)
    writeFileSync(this.path, JSON.stringify(tasks, null, 2))
  }
}
```

```markdown
<!-- scripts/codex/README.md -->
# Codex Coordination Harness

Single JSON queue at `scripts/codex/codex.queue.json` (gitignored) lists cookie-cutter tasks the master orchestrator hands off to a Codex agent.

Task kinds:
- `scaffold` — package skeleton creation
- `docs` — bulk MDX stub generation
- `rename` — mass renames across the tree
- `wiring` — repetitive cross-package wiring

Use `bun run scripts/codex/queue.ts` to operate the queue (subcommands: `list`, `enqueue`, `done`).
```

- [ ] **Step 4: Add `codex.queue.json` to gitignore**

Edit: `.gitignore`

```diff
+ scripts/codex/codex.queue.json
```

- [ ] **Step 5: Run tests**

Run: `bun test scripts/codex/queue.test.ts`
Expected: 3 PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/codex .gitignore
git commit -m "feat(codex): add file-backed coordination queue"
```

---

## Section D — Roadmap Update

### Task 9: Update `docs/ROADMAP.md`

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Replace the "What Banhmi Intentionally Omits" section**

Find:

```
### What Banhmi Intentionally Omits

- **Microservices** — use Bun's native TCP/UDP directly or a dedicated message broker
- **GraphQL** — orthogonal concern; use a standalone GraphQL library
- **Platform-agnostic adapters** — Bun-only by design; no Express/Fastify shim
```

Replace with:

```
### What Banhmi Intentionally Omits

- **Platform-agnostic adapters** — Bun-only by design; no Express/Fastify shim.

> Microservices and GraphQL were originally listed as omitted. As of 2026-05-08 the Banhmi Supremacy programme adds first-class `@banhmi/microservices` (Wave 8) and `@banhmi/graphql` (Wave 7) packages. See `docs/superpowers/specs/2026-05-08-banhmi-supremacy-master-design.md`.
```

- [ ] **Step 2: Update the comparison table to reflect coming work**

Find rows for `Microservices` and `GraphQL` and update the `Banhmi` column from `Not planned` to `v0.13 (Wave 8)` and `v0.12 (Wave 7)` respectively.

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs(roadmap): include Microservices + GraphQL via Supremacy programme"
```

---

## Section E — Benchmark Harness

### Task 10: Benchmark scaffolding

**Files:**
- Create: `benchmarks/package.json`
- Create: `benchmarks/README.md`
- Create: `benchmarks/runners/oha.ts`
- Create: `benchmarks/runners/oha.test.ts`
- Create: `benchmarks/scenarios/.gitkeep`
- Create: `benchmarks/competitors/.gitkeep`
- Create: `benchmarks/results/.gitkeep`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@banhmi/benchmarks",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "smoke": "bun run runners/smoke.ts"
  },
  "dependencies": {
    "banhmi": "workspace:*"
  }
}
```

- [ ] **Step 2: Add `benchmarks` to root workspaces**

Modify: `package.json`

```diff
   "workspaces": [
     "packages/*",
-    "examples/*"
+    "examples/*",
+    "examples/features/*",
+    "benchmarks"
   ]
```

- [ ] **Step 3: Write the failing test for the `oha` runner**

```ts
// benchmarks/runners/oha.test.ts
import { test, expect } from 'bun:test'
import { parseOhaJson } from './oha'

test('parses oha JSON output', () => {
  const sample = JSON.stringify({
    summary: {
      requestsPerSec: 1234.5,
      total: 60.1,
    },
    latencyPercentiles: { p50: 0.001, p95: 0.002, p99: 0.003 },
  })
  const r = parseOhaJson(sample)
  expect(r.rps).toBeCloseTo(1234.5, 1)
  expect(r.p99).toBeCloseTo(0.003, 4)
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun test benchmarks/runners/oha.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implement the runner**

```ts
// benchmarks/runners/oha.ts
import { spawn } from 'node:child_process'

export type OhaResult = {
  rps: number
  p50: number
  p95: number
  p99: number
  totalSeconds: number
}

/**
 * Parse the JSON document produced by `oha --json`.
 *
 * @example
 * const r = parseOhaJson(await Bun.spawn(['oha', '--json', url]).stdout.text())
 */
export function parseOhaJson(json: string): OhaResult {
  const parsed = JSON.parse(json) as {
    summary: { requestsPerSec: number; total: number }
    latencyPercentiles: { p50: number; p95: number; p99: number }
  }
  return {
    rps: parsed.summary.requestsPerSec,
    totalSeconds: parsed.summary.total,
    p50: parsed.latencyPercentiles.p50,
    p95: parsed.latencyPercentiles.p95,
    p99: parsed.latencyPercentiles.p99,
  }
}

/**
 * Run `oha` against a URL for `seconds`, return parsed result.
 * Throws if `oha` is not installed.
 */
export async function runOha(url: string, seconds: number): Promise<OhaResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('oha', ['--json', '-z', `${seconds}s`, '--no-tui', url])
    let stdout = ''
    child.stdout.on('data', (b) => {
      stdout += b.toString()
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code !== 0) reject(new Error(`oha exited ${code}`))
      else resolve(parseOhaJson(stdout))
    })
  })
}
```

- [ ] **Step 6: Run tests**

Run: `bun test benchmarks/runners/oha.test.ts`
Expected: 1 PASS.

- [ ] **Step 7: Commit**

```bash
git add benchmarks package.json
git commit -m "feat(benchmarks): scaffold benchmarks workspace and oha runner"
```

---

### Task 11: Hello-world Banhmi competitor

**Files:**
- Create: `benchmarks/competitors/banhmi/package.json`
- Create: `benchmarks/competitors/banhmi/src/main.ts`
- Create: `benchmarks/competitors/banhmi/.gitignore`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@banhmi/competitor-banhmi",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "start": "bun run src/main.ts"
  },
  "dependencies": {
    "banhmi": "workspace:*"
  }
}
```

- [ ] **Step 2: Add this competitor to the root workspaces**

Modify root `package.json` workspaces array:

```diff
+    "benchmarks/competitors/*"
```

- [ ] **Step 3: `src/main.ts`**

```ts
import { Module, Controller, Get, BanhmiFactory } from 'banhmi'

@Controller()
class Hello {
  @Get('/')
  hello() {
    return { hello: 'world' }
  }
}

@Module({ controllers: [Hello] })
class AppModule {}

const port = Number(Bun.env.PORT ?? 3001)
const app = await BanhmiFactory.create(AppModule)
await app.listen({ port })
console.log(`banhmi listening on :${port}`)
```

(If `BanhmiFactory.create` is named differently in `packages/platform-bun/src/factory.ts`, use that name. Verify before writing.)

- [ ] **Step 4: `.gitignore`**

```
node_modules
```

- [ ] **Step 5: Smoke test**

Run: `cd benchmarks/competitors/banhmi && PORT=0 timeout 3 bun run src/main.ts || true`
Expected: prints `banhmi listening on :<port>` and exits at 3 s.

- [ ] **Step 6: Commit**

```bash
git add benchmarks/competitors/banhmi package.json
git commit -m "feat(benchmarks): add Banhmi hello-world competitor"
```

---

### Task 12: NestJS@Express hello competitor

**Files:**
- Create: `benchmarks/competitors/nestjs-express/package.json`
- Create: `benchmarks/competitors/nestjs-express/src/main.ts`
- Create: `benchmarks/competitors/nestjs-express/src/app.module.ts`
- Create: `benchmarks/competitors/nestjs-express/src/hello.controller.ts`
- Create: `benchmarks/competitors/nestjs-express/tsconfig.json`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "competitor-nestjs-express",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "start": "bun run src/main.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.10",
    "@nestjs/core": "^10.4.10",
    "@nestjs/platform-express": "^10.4.10",
    "express": "^4.21.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "typescript": "^5.5.4"
  }
}
```

> Note: this is the only place `reflect-metadata` is allowed in the repo. The `no-reflect` quality script ignores `benchmarks/competitors/`.

- [ ] **Step 2: Update `no-reflect` quality script to ignore competitors**

Modify: `scripts/quality/no-reflect.ts`

Change the glob from `'{packages,examples,apps,benchmarks}/**/*.{ts,tsx}'` to `'{packages,examples,apps}/**/*.{ts,tsx}'`. Add a unit test asserting that a path under `benchmarks/competitors/` does not raise (the function operates on supplied files, so the unit test is implicit; the change is purely in the glob).

- [ ] **Step 3: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: `src/hello.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common'

@Controller()
export class HelloController {
  @Get('/')
  hello() {
    return { hello: 'world' }
  }
}
```

- [ ] **Step 5: `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common'
import { HelloController } from './hello.controller'

@Module({ controllers: [HelloController] })
export class AppModule {}
```

- [ ] **Step 6: `src/main.ts`**

```ts
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false })
  const port = Number(process.env.PORT ?? 3002)
  await app.listen(port)
  console.log(`nestjs-express listening on :${port}`)
}
bootstrap()
```

- [ ] **Step 7: Install and smoke test**

Run: `bun install`
Then: `cd benchmarks/competitors/nestjs-express && timeout 3 bun run start || true`
Expected: prints `nestjs-express listening on :3002`.

- [ ] **Step 8: Commit**

```bash
git add benchmarks/competitors/nestjs-express scripts/quality/no-reflect.ts
git commit -m "feat(benchmarks): add NestJS@Express hello-world competitor"
```

---

### Task 13: NestJS@Fastify hello competitor

**Files:**
- Create: `benchmarks/competitors/nestjs-fastify/package.json`
- Create: `benchmarks/competitors/nestjs-fastify/src/main.ts`
- Create: `benchmarks/competitors/nestjs-fastify/src/app.module.ts`
- Create: `benchmarks/competitors/nestjs-fastify/src/hello.controller.ts`
- Create: `benchmarks/competitors/nestjs-fastify/tsconfig.json`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "competitor-nestjs-fastify",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "start": "bun run src/main.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.10",
    "@nestjs/core": "^10.4.10",
    "@nestjs/platform-fastify": "^10.4.10",
    "fastify": "^4.28.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": { "typescript": "^5.5.4" }
}
```

- [ ] **Step 2: `tsconfig.json`** — identical to nestjs-express tsconfig.

- [ ] **Step 3: `src/hello.controller.ts`** — identical to nestjs-express version (different package, same contents).

- [ ] **Step 4: `src/app.module.ts`** — identical to nestjs-express.

- [ ] **Step 5: `src/main.ts`**

```ts
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  )
  const port = Number(process.env.PORT ?? 3003)
  await app.listen(port, '0.0.0.0')
  console.log(`nestjs-fastify listening on :${port}`)
}
bootstrap()
```

- [ ] **Step 6: Install and smoke test**

Run: `bun install`
Then: `cd benchmarks/competitors/nestjs-fastify && timeout 3 bun run start || true`
Expected: prints `nestjs-fastify listening on :3003`.

- [ ] **Step 7: Commit**

```bash
git add benchmarks/competitors/nestjs-fastify
git commit -m "feat(benchmarks): add NestJS@Fastify hello-world competitor"
```

---

### Task 14: `benchmarks:smoke` script

**Files:**
- Create: `benchmarks/runners/smoke.ts`
- Create: `benchmarks/runners/smoke.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test (unit-only — does not actually run servers)**

```ts
// benchmarks/runners/smoke.test.ts
import { test, expect } from 'bun:test'
import { describeOhaCheckPath } from './smoke'

test('smoke runner checks for `oha` executable', () => {
  const desc = describeOhaCheckPath('/usr/bin/oha')
  expect(desc).toContain('/usr/bin/oha')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test benchmarks/runners/smoke.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// benchmarks/runners/smoke.ts
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { runOha } from './oha'

export const describeOhaCheckPath = (path: string): string =>
  `Will use oha at ${path}`

type Competitor = {
  name: string
  cwd: string
  port: number
}

const COMPETITORS: Competitor[] = [
  { name: 'banhmi', cwd: 'benchmarks/competitors/banhmi', port: 3001 },
  { name: 'nestjs-express', cwd: 'benchmarks/competitors/nestjs-express', port: 3002 },
  { name: 'nestjs-fastify', cwd: 'benchmarks/competitors/nestjs-fastify', port: 3003 },
]

async function ohaInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const c = spawn('which', ['oha'])
    c.on('exit', (code) => resolve(code === 0))
    c.on('error', () => resolve(false))
  })
}

async function startServer(c: Competitor): Promise<() => void> {
  const child = spawn('bun', ['run', 'start'], {
    cwd: c.cwd,
    env: { ...process.env, PORT: String(c.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await sleep(2_000) // give server time to bind
  return () => child.kill('SIGTERM')
}

async function main(): Promise<number> {
  if (!(await ohaInstalled())) {
    console.log('smoke: skipping — oha not installed (install with `brew install oha`)')
    return 0
  }
  const stops: (() => void)[] = []
  try {
    for (const c of COMPETITORS) {
      stops.push(await startServer(c))
      const r = await runOha(`http://localhost:${c.port}/`, 3)
      console.log(`${c.name}: ${r.rps.toFixed(0)} rps p99=${(r.p99 * 1000).toFixed(2)}ms`)
    }
    return 0
  } catch (err) {
    console.error('smoke: failed', err)
    return 1
  } finally {
    for (const stop of stops) stop()
  }
}

if (import.meta.main) {
  process.exit(await main())
}
```

- [ ] **Step 4: Add root script**

Modify root `package.json` scripts:

```diff
+    "benchmarks:smoke": "bun run benchmarks/runners/smoke.ts",
```

- [ ] **Step 5: Run unit tests**

Run: `bun test benchmarks/runners/smoke.test.ts`
Expected: 1 PASS.

- [ ] **Step 6: Run the smoke script (advisory)**

Run: `bun run benchmarks:smoke`
Expected: either prints "skipping — oha not installed", or prints three lines with rps numbers and exits 0.

- [ ] **Step 7: Commit**

```bash
git add benchmarks/runners/smoke.ts benchmarks/runners/smoke.test.ts package.json
git commit -m "feat(benchmarks): add benchmarks:smoke harness"
```

---

## Section F — Docs MDX Pipeline

### Task 15: Add MDX support to the docs Vite app

**Files:**
- Modify: `apps/docs/apps/web/package.json`
- Modify: `apps/docs/apps/web/vite.config.ts`

- [ ] **Step 1: Add deps**

Edit `apps/docs/apps/web/package.json` to add to `dependencies`:

```json
"@mdx-js/rollup": "^3.1.0",
"@mdx-js/react": "^3.1.0",
"remark-gfm": "^4.0.0",
"rehype-shiki": "^1.0.0"
```

(If those exact versions don't resolve, use the latest available; verify via `bun pm view <pkg> version`.)

- [ ] **Step 2: Wire MDX into Vite**

Replace `apps/docs/apps/web/vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'

const config = defineConfig({
  plugins: [
    nitro(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    {
      enforce: 'pre',
      ...mdx({ remarkPlugins: [remarkGfm], providerImportSource: '@mdx-js/react' }),
    },
    tanstackStart(),
    viteReact(),
  ],
})

export default config
```

- [ ] **Step 3: Install and dev-run smoke**

Run: `bun install`
Then: `cd apps/docs/apps/web && timeout 5 bun run dev || true`
Expected: vite dev starts without MDX-related errors. Look for `Local: http://localhost:3000` then exit.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/apps/web/package.json apps/docs/apps/web/vite.config.ts bun.lock apps/docs/bun.lock
git commit -m "build(docs): wire MDX rollup plugin"
```

---

### Task 16: `<CodeFromExample />` MDX component

**Files:**
- Create: `apps/docs/apps/web/src/components/code-from-example.tsx`
- Create: `apps/docs/apps/web/src/components/code-from-example.test.tsx`
- Create: `apps/docs/apps/web/src/components/mdx-provider.tsx`
- Modify: `apps/docs/apps/web/src/routes/__root.tsx`

- [ ] **Step 1: Write the failing test**

Component test relies on a tiny in-process import-meta-glob mock; full DOM rendering is overkill for Wave 0. Test that the component selects the correct example file path for a given slug.

```tsx
// apps/docs/apps/web/src/components/code-from-example.test.tsx
import { test, expect } from 'bun:test'
import { resolveExamplePath } from './code-from-example'

test('resolveExamplePath maps slug to examples/features path', () => {
  expect(resolveExamplePath('middleware-fn')).toBe(
    '/examples/features/middleware-fn/index.ts',
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/docs/apps/web && bun test src/components/code-from-example.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

```tsx
// apps/docs/apps/web/src/components/code-from-example.tsx
import { useEffect, useState } from 'react'

export const resolveExamplePath = (slug: string): string =>
  `/examples/features/${slug}/index.ts`

// Path is relative from this file to the repo-root examples directory.
// File is at apps/docs/apps/web/src/components/code-from-example.tsx (6 levels deep
// before repo root), so the glob walks up six segments.
const examples = import.meta.glob(
  '../../../../../../examples/features/*/index.ts',
  { query: '?raw', import: 'default' },
) as Record<string, () => Promise<string>>

type Props = { slug: string; lang?: string }

/**
 * Renders the contents of `examples/features/<slug>/index.ts` as a code block.
 * The example is the single source of truth — doc snippets never duplicate code.
 *
 * @example
 * <CodeFromExample slug="middleware-fn" />
 */
export function CodeFromExample({ slug, lang = 'ts' }: Props) {
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    const key = Object.keys(examples).find((k) => k.endsWith(`/${slug}/index.ts`))
    if (!key) {
      setCode(`// example "${slug}" not found`)
      return
    }
    examples[key]().then(setCode)
  }, [slug])
  if (code === null) return <pre>loading…</pre>
  return (
    <pre data-lang={lang}>
      <code>{code}</code>
    </pre>
  )
}
```

```tsx
// apps/docs/apps/web/src/components/mdx-provider.tsx
import { MDXProvider } from '@mdx-js/react'
import type { ReactNode } from 'react'
import { CodeFromExample } from './code-from-example'

const components = { CodeFromExample }

export function DocsMdxProvider({ children }: { children: ReactNode }) {
  return <MDXProvider components={components}>{children}</MDXProvider>
}
```

- [ ] **Step 4: Wrap the root layout in the MDX provider**

Read: `apps/docs/apps/web/src/routes/__root.tsx`. Add an import for `DocsMdxProvider` and wrap the rendered `<Outlet />` (or equivalent) with it. Do **not** change other layout details.

- [ ] **Step 5: Run unit test**

Run: `cd apps/docs/apps/web && bun test src/components/code-from-example.test.tsx`
Expected: 1 PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/apps/web/src/components/code-from-example.tsx \
        apps/docs/apps/web/src/components/code-from-example.test.tsx \
        apps/docs/apps/web/src/components/mdx-provider.tsx \
        apps/docs/apps/web/src/routes/__root.tsx
git commit -m "feat(docs): add CodeFromExample MDX component"
```

---

### Task 17: Doc-route stub generator

**Files:**
- Create: `apps/docs/apps/web/src/content/doc-routes.json`
- Create: `apps/docs/apps/web/scripts/generate-doc-routes.ts`
- Create: `apps/docs/apps/web/scripts/generate-doc-routes.test.ts`
- Modify: `apps/docs/apps/web/package.json`

- [ ] **Step 1: Define the route IA as data**

```json
// apps/docs/apps/web/src/content/doc-routes.json
{
  "sections": [
    {
      "slug": "introduction",
      "title": "Introduction",
      "items": [
        { "slug": "first-steps", "title": "First Steps" }
      ]
    },
    {
      "slug": "overview",
      "title": "Overview",
      "items": [
        { "slug": "controllers", "title": "Controllers" },
        { "slug": "providers", "title": "Providers" },
        { "slug": "modules", "title": "Modules" },
        { "slug": "middleware", "title": "Middleware" },
        { "slug": "exception-filters", "title": "Exception Filters" },
        { "slug": "pipes", "title": "Pipes" },
        { "slug": "guards", "title": "Guards" },
        { "slug": "interceptors", "title": "Interceptors" },
        { "slug": "custom-decorators", "title": "Custom Decorators" }
      ]
    },
    {
      "slug": "fundamentals",
      "title": "Fundamentals",
      "items": [
        { "slug": "custom-providers", "title": "Custom Providers" },
        { "slug": "asynchronous-providers", "title": "Asynchronous Providers" },
        { "slug": "dynamic-modules", "title": "Dynamic Modules" },
        { "slug": "injection-scopes", "title": "Injection Scopes" },
        { "slug": "circular-dependency", "title": "Circular Dependency" },
        { "slug": "module-reference", "title": "Module Reference" },
        { "slug": "lazy-loading-modules", "title": "Lazy-loading Modules" },
        { "slug": "execution-context", "title": "Execution Context" },
        { "slug": "lifecycle-events", "title": "Lifecycle Events" },
        { "slug": "discovery-service", "title": "Discovery Service" },
        { "slug": "platform-agnosticism", "title": "Platform Agnosticism" },
        { "slug": "testing", "title": "Testing" }
      ]
    },
    {
      "slug": "bun-native",
      "title": "Bun-native APIs",
      "items": [
        { "slug": "bun-serve", "title": "Bun.serve" },
        { "slug": "bun-sqlite", "title": "bun:sqlite" },
        { "slug": "bun-sql", "title": "Bun.sql" },
        { "slug": "bun-s3", "title": "Bun.S3Client" },
        { "slug": "bun-password", "title": "Bun.password" },
        { "slug": "bun-compression", "title": "Bun.gzip / deflate / zstd" },
        { "slug": "native-formdata", "title": "Native FormData" },
        { "slug": "native-websocket", "title": "Native WebSocket" }
      ]
    },
    {
      "slug": "built-ins",
      "title": "Built-ins",
      "items": [
        { "slug": "pipes", "title": "Built-in Pipes" },
        { "slug": "validators", "title": "Built-in Validators" },
        { "slug": "transformers", "title": "Built-in Transformers" },
        { "slug": "exceptions", "title": "Built-in Exceptions" },
        { "slug": "interceptors", "title": "Built-in Interceptors" }
      ]
    },
    {
      "slug": "techniques",
      "title": "Techniques",
      "items": [
        { "slug": "configuration", "title": "Configuration" },
        { "slug": "database", "title": "Database" },
        { "slug": "mongo", "title": "Mongo" },
        { "slug": "validation", "title": "Validation" },
        { "slug": "caching", "title": "Caching" },
        { "slug": "serialization", "title": "Serialization" },
        { "slug": "versioning", "title": "Versioning" },
        { "slug": "task-scheduling", "title": "Task Scheduling" },
        { "slug": "queues", "title": "Queues" },
        { "slug": "logging", "title": "Logging" },
        { "slug": "cookies", "title": "Cookies" },
        { "slug": "events", "title": "Events" },
        { "slug": "compression", "title": "Compression" },
        { "slug": "file-upload", "title": "File Upload" },
        { "slug": "streaming-files", "title": "Streaming Files" },
        { "slug": "http-module", "title": "HTTP Module" },
        { "slug": "session", "title": "Session" },
        { "slug": "mvc", "title": "Model-View-Controller" },
        { "slug": "performance", "title": "Performance" },
        { "slug": "sse", "title": "Server-Sent Events" }
      ]
    },
    {
      "slug": "security",
      "title": "Security",
      "items": [
        { "slug": "authentication", "title": "Authentication" },
        { "slug": "authorization", "title": "Authorization" },
        { "slug": "encryption-and-hashing", "title": "Encryption and Hashing" },
        { "slug": "helmet", "title": "Helmet" },
        { "slug": "cors", "title": "CORS" },
        { "slug": "csrf", "title": "CSRF Protection" },
        { "slug": "rate-limiting", "title": "Rate limiting" }
      ]
    },
    {
      "slug": "graphql",
      "title": "GraphQL",
      "items": [
        { "slug": "quick-start", "title": "Quick Start" },
        { "slug": "resolvers", "title": "Resolvers" },
        { "slug": "mutations", "title": "Mutations" },
        { "slug": "subscriptions", "title": "Subscriptions" },
        { "slug": "scalars", "title": "Scalars" },
        { "slug": "directives", "title": "Directives" },
        { "slug": "interfaces", "title": "Interfaces" },
        { "slug": "unions-and-enums", "title": "Unions and Enums" },
        { "slug": "field-middleware", "title": "Field Middleware" },
        { "slug": "mapped-types", "title": "Mapped Types" },
        { "slug": "plugins", "title": "Plugins" },
        { "slug": "complexity", "title": "Complexity" },
        { "slug": "extensions", "title": "Extensions" },
        { "slug": "cli-plugin", "title": "CLI Plugin" },
        { "slug": "generating-sdl", "title": "Generating SDL" },
        { "slug": "sharing-models", "title": "Sharing Models" },
        { "slug": "other-features", "title": "Other Features" },
        { "slug": "federation", "title": "Federation" }
      ]
    },
    {
      "slug": "websockets",
      "title": "WebSockets",
      "items": [
        { "slug": "gateways", "title": "Gateways" },
        { "slug": "exception-filters", "title": "Exception Filters" },
        { "slug": "pipes", "title": "Pipes" },
        { "slug": "guards", "title": "Guards" },
        { "slug": "interceptors", "title": "Interceptors" },
        { "slug": "adapters", "title": "Adapters" }
      ]
    },
    {
      "slug": "microservices",
      "title": "Microservices",
      "items": [
        { "slug": "overview", "title": "Overview" },
        { "slug": "redis", "title": "Redis" },
        { "slug": "mqtt", "title": "MQTT" },
        { "slug": "nats", "title": "NATS" },
        { "slug": "rabbitmq", "title": "RabbitMQ" },
        { "slug": "kafka", "title": "Kafka" },
        { "slug": "grpc", "title": "gRPC" },
        { "slug": "custom-transporters", "title": "Custom Transporters" },
        { "slug": "exception-filters", "title": "Exception Filters" },
        { "slug": "pipes", "title": "Pipes" },
        { "slug": "guards", "title": "Guards" },
        { "slug": "interceptors", "title": "Interceptors" }
      ]
    },
    {
      "slug": "deployment",
      "title": "Deployment",
      "items": [
        { "slug": "standalone-apps", "title": "Standalone Apps" },
        { "slug": "https-and-multiple-servers", "title": "HTTPS & Multiple Servers" },
        { "slug": "hybrid", "title": "Hybrid Application" },
        { "slug": "edge", "title": "Edge / Serverless" },
        { "slug": "hot-reload", "title": "Hot Reload" },
        { "slug": "raw-body", "title": "Raw Body" },
        { "slug": "keep-alive", "title": "Keep-Alive Connections" },
        { "slug": "request-lifecycle", "title": "Request Lifecycle" },
        { "slug": "common-errors", "title": "Common Errors" }
      ]
    },
    {
      "slug": "cli",
      "title": "CLI",
      "items": [
        { "slug": "overview", "title": "Overview" },
        { "slug": "workspaces", "title": "Workspaces" },
        { "slug": "libraries", "title": "Libraries" },
        { "slug": "usage", "title": "Usage" },
        { "slug": "scripts", "title": "Scripts" }
      ]
    },
    {
      "slug": "openapi",
      "title": "OpenAPI",
      "items": [
        { "slug": "introduction", "title": "Introduction" },
        { "slug": "scalar", "title": "Scalar" },
        { "slug": "types-and-parameters", "title": "Types and Parameters" },
        { "slug": "operations", "title": "Operations" },
        { "slug": "security", "title": "Security" },
        { "slug": "mapped-types", "title": "Mapped Types" },
        { "slug": "decorators", "title": "Decorators" },
        { "slug": "cli-plugin", "title": "CLI Plugin" },
        { "slug": "other-features", "title": "Other Features" }
      ]
    },
    {
      "slug": "recipes",
      "title": "Recipes",
      "items": [
        { "slug": "repl", "title": "REPL" },
        { "slug": "crud-generator", "title": "CRUD Generator" },
        { "slug": "swc", "title": "SWC" },
        { "slug": "passport", "title": "Passport (auth)" },
        { "slug": "hot-reload", "title": "Hot reload" },
        { "slug": "mikroorm", "title": "MikroORM" },
        { "slug": "typeorm", "title": "TypeORM" },
        { "slug": "mongoose", "title": "Mongoose" },
        { "slug": "sequelize", "title": "Sequelize" },
        { "slug": "router-module", "title": "Router Module" },
        { "slug": "swagger", "title": "Swagger" },
        { "slug": "health-checks", "title": "Health checks" },
        { "slug": "cqrs", "title": "CQRS" },
        { "slug": "compodoc", "title": "Compodoc" },
        { "slug": "prisma", "title": "Prisma" },
        { "slug": "sentry", "title": "Sentry" },
        { "slug": "serve-static", "title": "Serve static" },
        { "slug": "commander", "title": "Commander" },
        { "slug": "async-local-storage", "title": "Async local storage" },
        { "slug": "necord", "title": "Necord" },
        { "slug": "suites", "title": "Suites (Automock)" }
      ]
    },
    {
      "slug": "migration",
      "title": "Migration from NestJS",
      "items": [
        { "slug": "concepts", "title": "Concept Mapping" },
        { "slug": "codemods", "title": "Codemods" },
        { "slug": "compat", "title": "Compatibility caveats" }
      ]
    },
    {
      "slug": "performance",
      "title": "Performance & Benchmarks",
      "items": [
        { "slug": "methodology", "title": "Methodology" },
        { "slug": "results", "title": "Live Results" },
        { "slug": "tuning", "title": "Tuning Checklist" }
      ]
    },
    {
      "slug": "production",
      "title": "Production Checklist",
      "items": []
    },
    {
      "slug": "examples",
      "title": "Examples Catalog",
      "items": []
    },
    {
      "slug": "devtools",
      "title": "Devtools",
      "items": [
        { "slug": "overview", "title": "Overview" },
        { "slug": "ci-cd-integration", "title": "CI/CD Integration" }
      ]
    },
    {
      "slug": "faq",
      "title": "FAQ",
      "items": [
        { "slug": "serverless", "title": "Serverless" },
        { "slug": "http-adapter", "title": "HTTP adapter" },
        { "slug": "keep-alive", "title": "Keep-Alive connections" },
        { "slug": "global-path-prefix", "title": "Global path prefix" },
        { "slug": "raw-body", "title": "Raw body" },
        { "slug": "hybrid-application", "title": "Hybrid application" },
        { "slug": "https-and-multiple-servers", "title": "HTTPS & multiple servers" },
        { "slug": "request-lifecycle", "title": "Request lifecycle" },
        { "slug": "common-errors", "title": "Common errors" },
        { "slug": "examples", "title": "Examples" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Write the test for the generator**

```ts
// apps/docs/apps/web/scripts/generate-doc-routes.test.ts
import { test, expect } from 'bun:test'
import { generateRouteEntries } from './generate-doc-routes'

test('generator emits one entry per item', () => {
  const out = generateRouteEntries({
    sections: [
      {
        slug: 'overview',
        title: 'Overview',
        items: [{ slug: 'controllers', title: 'Controllers' }],
      },
    ],
  })
  expect(out).toEqual([
    {
      mdxPath: 'src/content/overview/controllers.mdx',
      routePath: 'src/routes/docs/overview.controllers.tsx',
      sectionSlug: 'overview',
      sectionTitle: 'Overview',
      itemSlug: 'controllers',
      itemTitle: 'Controllers',
    },
  ])
})

test('generator emits a section index when items is empty', () => {
  const out = generateRouteEntries({
    sections: [
      { slug: 'production', title: 'Production Checklist', items: [] },
    ],
  })
  expect(out).toHaveLength(1)
  expect(out[0].itemSlug).toBe('index')
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/docs/apps/web && bun test scripts/generate-doc-routes.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the generator**

```ts
// apps/docs/apps/web/scripts/generate-doc-routes.ts
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type DocItem = { slug: string; title: string }
export type DocSection = { slug: string; title: string; items: DocItem[] }
export type DocConfig = { sections: DocSection[] }

export type RouteEntry = {
  mdxPath: string
  routePath: string
  sectionSlug: string
  sectionTitle: string
  itemSlug: string
  itemTitle: string
}

export function generateRouteEntries(cfg: DocConfig): RouteEntry[] {
  const out: RouteEntry[] = []
  for (const section of cfg.sections) {
    const items = section.items.length > 0 ? section.items : [{ slug: 'index', title: section.title }]
    for (const item of items) {
      out.push({
        mdxPath: `src/content/${section.slug}/${item.slug}.mdx`,
        routePath: `src/routes/docs/${section.slug}.${item.slug}.tsx`,
        sectionSlug: section.slug,
        sectionTitle: section.title,
        itemSlug: item.slug,
        itemTitle: item.title,
      })
    }
  }
  return out
}

const STUB_MDX = (entry: RouteEntry) => `# ${entry.itemTitle}

> **Status:** Placeholder. This page will be filled in during the wave that owns it (see \`docs/superpowers/specs/2026-05-08-banhmi-supremacy-master-design.md\`).

## When to use

TBD

## Setup

TBD

## Usage

{/* <CodeFromExample slug="<feature-slug>" /> */}

## API reference

TBD

## See also

TBD
`

const STUB_ROUTE = (entry: RouteEntry) => `import { createFileRoute } from '@tanstack/react-router'
import Content from '../../content/${entry.sectionSlug}/${entry.itemSlug}.mdx'

export const Route = createFileRoute('/docs/${entry.sectionSlug}/${entry.itemSlug}')({
  component: () => <Content />,
})
`

async function main(): Promise<void> {
  const cfgPath = join(import.meta.dir, '..', 'src', 'content', 'doc-routes.json')
  const cfg = JSON.parse(await Bun.file(cfgPath).text()) as DocConfig
  const entries = generateRouteEntries(cfg)
  for (const entry of entries) {
    const mdxAbs = join(import.meta.dir, '..', entry.mdxPath)
    const routeAbs = join(import.meta.dir, '..', entry.routePath)
    if (!existsSync(mdxAbs)) {
      mkdirSync(dirname(mdxAbs), { recursive: true })
      writeFileSync(mdxAbs, STUB_MDX(entry))
    }
    if (!existsSync(routeAbs)) {
      mkdirSync(dirname(routeAbs), { recursive: true })
      writeFileSync(routeAbs, STUB_ROUTE(entry))
    }
  }
  console.log(`generated ${entries.length} route entries`)
}

if (import.meta.main) {
  await main()
}
```

- [ ] **Step 5: Add `docs:generate-routes` script**

In `apps/docs/apps/web/package.json` add to `scripts`:

```json
"docs:generate-routes": "bun run scripts/generate-doc-routes.ts"
```

- [ ] **Step 6: Run unit tests**

Run: `cd apps/docs/apps/web && bun test scripts/generate-doc-routes.test.ts`
Expected: 2 PASS.

- [ ] **Step 7: Run the generator (creates ~150 stubs)**

Run: `cd apps/docs/apps/web && bun run docs:generate-routes`
Expected: prints `generated <N> route entries` (N around 130).

- [ ] **Step 8: Commit**

```bash
git add apps/docs/apps/web/src/content \
        apps/docs/apps/web/src/routes/docs \
        apps/docs/apps/web/scripts \
        apps/docs/apps/web/package.json
git commit -m "feat(docs): scaffold doc routes from IA config (~130 stubs)"
```

---

### Task 18: Sidebar reflects new IA

**Files:**
- Modify: `apps/docs/apps/web/src/components/app-sidebar.tsx`

- [ ] **Step 1: Replace the file**

Write the file with this content (preserves shadcn primitives and the header card; swaps the hard-coded `data` object for one derived from `doc-routes.json`, and points links at `/docs/<section>/<item>`):

```tsx
import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@workspace/ui/components/sidebar'
import { RowsIcon } from '@phosphor-icons/react'
import docRoutes from '../content/doc-routes.json'

type Item = { slug: string; title: string }
type Section = { slug: string; title: string; items: Item[] }
const sections = (docRoutes as { sections: Section[] }).sections

const itemHref = (sectionSlug: string, itemSlug: string) =>
  `/docs/${sectionSlug}/${itemSlug}`

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { location } = useRouterState()
  const currentPath = location.pathname

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <RowsIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Banhmi Docs</span>
                <span>v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sections.map((section) => {
              const items =
                section.items.length > 0
                  ? section.items
                  : [{ slug: 'index', title: section.title }]
              return (
                <SidebarMenuItem key={section.slug}>
                  <SidebarMenuButton className="font-medium">
                    {section.title}
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {items.map((item) => {
                      const href = itemHref(section.slug, item.slug)
                      return (
                        <SidebarMenuSubItem key={`${section.slug}/${item.slug}`}>
                          <SidebarMenuSubButton
                            isActive={currentPath === href}
                            render={<Link to={href} />}
                          >
                            {item.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
```

- [ ] **Step 2: Verify dev server starts**

Run: `cd apps/docs/apps/web && timeout 5 bun run dev || true`
Expected: vite dev server boots without TS errors. Sidebar links resolve to the new `/docs/...` paths.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/apps/web/src/components/app-sidebar.tsx
git commit -m "feat(docs): drive sidebar from doc-routes.json"
```

---

### Task 19: Root `docs:build` script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script**

```diff
+    "docs:build": "bun run --cwd apps/docs/apps/web build",
+    "docs:dev": "bun run --cwd apps/docs/apps/web dev"
```

- [ ] **Step 2: Verify build succeeds**

Run: `bun run docs:build`
Expected: vite build completes without errors. If it errors on missing MDX types, add `apps/docs/apps/web/src/mdx.d.ts`:

```ts
declare module '*.mdx' {
  const Component: () => JSX.Element
  export default Component
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json apps/docs/apps/web/src/mdx.d.ts
git commit -m "build(docs): add docs:build root script and MDX type shim"
```

---

## Section G — CI Matrix

### Task 20: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: test (${{ matrix.bun }})
    runs-on: ubuntu-24.04
    strategy:
      fail-fast: false
      matrix:
        bun: [latest, canary]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ matrix.bun }}
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run quality
      - run: bun test --recursive

  docs:
    name: docs build
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run docs:build

  benchmarks-smoke:
    name: benchmarks smoke
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: install oha
        run: |
          curl -sSL https://github.com/hatoo/oha/releases/latest/download/oha-linux-amd64 -o /usr/local/bin/oha
          chmod +x /usr/local/bin/oha
      - run: bun install --frozen-lockfile
      - run: bun run benchmarks:smoke
```

- [ ] **Step 2: Validate locally**

Run: `bun run lint && bun run quality && bun test --recursive`
Expected: all green. Doc build: `bun run docs:build` green. Smoke: `bun run benchmarks:smoke` green or `skipping`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Bun matrix, docs build, and benchmark smoke workflow"
```

---

## Section H — Verification Gate

### Task 21: Run the wave-0 verification gate

- [ ] **Step 1: Run all gates in sequence**

```bash
bun run lint
bun run quality
bun test --recursive
bun run docs:build
bun run benchmarks:smoke
```

Each command must exit 0. If any fail, **do not** mark the wave complete; open a new task to fix the failure (e.g., debug with `superpowers:systematic-debugging`).

- [ ] **Step 2: Confirm no `any`/`!`/`reflect-metadata` regressions in source dirs**

Run: `bun run quality:no-anys && bun run quality:no-bangs && bun run quality:no-reflect && bun run quality:tsdoc`
Expected: all four print "clean".

- [ ] **Step 3: Tag a canary release**

```bash
git tag v0.3.0-canary.wave0
git log --oneline | head -25
```

- [ ] **Step 4: Final commit (if any housekeeping was needed)**

```bash
git status
```

If clean, the wave is done. If dirty, commit the residual diff with `chore(wave-0): finalize foundation` and re-run the gate.

---

## Self-Review Notes

Spec coverage check (against `docs/superpowers/specs/2026-05-08-banhmi-supremacy-master-design.md` § 7 Wave 0 deliverables):

| Wave-0 deliverable (master spec) | Task in this plan |
|---|---|
| Master spec + wave-0 plan committed | Master spec already committed; this plan is task 0 (this file) |
| All doc routes scaffolded with placeholder content | Task 17, 18 |
| `<CodeFromExample />` MDX component | Task 16 |
| `examples/features/.template/` reference template | Task 6 |
| `docs/superpowers/templates/feature-agent-prompt.md` | Task 7 |
| Quality scripts (`no-anys`, `no-bangs`, `no-reflect`, `tsdoc-coverage`) | Tasks 1–4 + 5 (wiring) |
| `benchmarks/` directory with runners/scenarios/competitors | Tasks 10–14 |
| Bench harness skeleton (Banhmi + NestJS@Express + NestJS@Fastify, oha smoke) | Tasks 11–14 |
| CI matrix (Bun latest+next, doc-build, benchmark-smoke) | Task 20 |
| Codex coordination harness | Task 8 |
| `docs/ROADMAP.md` updated | Task 9 |
| Verification gate | Task 21 |

Placeholders: none ("TBD" appears only inside generated MDX stubs, which is intentional — those are the placeholder content to be filled in subsequent waves).

Type consistency: function signatures referenced in tasks 1–4 and 7–8 are consistent (e.g., `findAnyUsages`, `findBangUsages`, `findReflectMetadataImports`, `findUndocumentedExports`, `CodexQueue.enqueue`, `CodexTask`).
