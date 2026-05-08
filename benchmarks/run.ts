/**
 * Benchmark orchestrator.
 *
 * For each (competitor × scenario) tuple:
 *   1. Boot the competitor on its assigned port.
 *   2. Run the appropriate runner (oha for HTTP load tests; cold-start / rss
 *      runners for process-level scenarios).
 *   3. Write results as JSON to benchmarks/results/<date>/<scenario>-<competitor>.json.
 *   4. Kill the competitor.
 *
 * If `oha` (or other load-test runners) is unavailable, writes placeholder JSON
 * with note: "harness only — runner unavailable" and exits 0.
 *
 * Usage:
 *   bun run benchmarks/run.ts
 *
 * Environment:
 *   BENCH_SECONDS   — duration per HTTP load scenario (default 10)
 *   BENCH_DATE      — override the result date folder (default today ISO)
 *   BENCH_SCENARIOS — comma-separated list of scenarios to run (default all)
 *   BENCH_TARGETS   — comma-separated list of competitors to run (default all)
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { measureColdStart } from './runners/cold-start'
import { parseOhaJson } from './runners/oha'
import { measureRssIdle } from './runners/rss'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Competitor = {
  name: string
  cwd: string
  port: number
}

type HttpScenario = {
  kind: 'http'
  name: string
  path: string
  method: 'GET' | 'POST'
  body?: string
  contentType?: string
}

type SpecialScenario = {
  kind: 'cold-start' | 'rss-idle' | 'pending'
  name: string
  path: string
}

type Scenario = HttpScenario | SpecialScenario

type BenchResult = Record<string, unknown> & {
  competitor: string
  scenario: string
  date: string
  note?: string
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, '..')

const ALL_COMPETITORS: Competitor[] = [
  {
    cwd: resolve(ROOT, 'benchmarks/competitors/banhmi'),
    name: 'banhmi',
    port: 3001,
  },
  {
    cwd: resolve(ROOT, 'benchmarks/competitors/nestjs-express'),
    name: 'nestjs-express',
    port: 3002,
  },
  {
    cwd: resolve(ROOT, 'benchmarks/competitors/nestjs-fastify'),
    name: 'nestjs-fastify',
    port: 3003,
  },
  {
    cwd: resolve(ROOT, 'benchmarks/competitors/hono'),
    name: 'hono',
    port: 3004,
  },
  {
    cwd: resolve(ROOT, 'benchmarks/competitors/elysia'),
    name: 'elysia',
    port: 3005,
  },
]

/** One-KB JSON payload for the json-roundtrip scenario. */
const JSON_PAYLOAD = JSON.stringify({
  id: 'bench-roundtrip-001',
  name: 'benchmark payload',
  description:
    'A payload used to test JSON round-trip performance in various frameworks.',
  tags: ['performance', 'benchmark', 'json'],
  nested: { level1: { level2: { value: 42, data: 'x'.repeat(512) } } },
  numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  flag: true,
})

const VALIDATION_PAYLOAD = JSON.stringify({
  f1: 'alpha',
  f2: 'bravo',
  f3: 'charlie',
  f4: 'delta',
  f5: 'echo',
  n1: 10,
  n2: 20,
  n3: 30,
  n4: 40,
  n5: 50,
})

const ALL_SCENARIOS: Scenario[] = [
  { kind: 'http', method: 'GET', name: 'hello', path: '/' },
  {
    body: JSON_PAYLOAD,
    contentType: 'application/json',
    kind: 'http',
    method: 'POST',
    name: 'json-roundtrip',
    path: '/json',
  },
  {
    body: VALIDATION_PAYLOAD,
    contentType: 'application/json',
    kind: 'http',
    method: 'POST',
    name: 'validation',
    path: '/validate',
  },
  { kind: 'pending', name: 'file-upload', path: '/upload' },
  { kind: 'pending', name: 'ws-throughput', path: '/ws' },
  { kind: 'pending', name: 'db-cats', path: '/cats' },
  { kind: 'cold-start', name: 'cold-start', path: '/' },
  { kind: 'rss-idle', name: 'rss-idle', path: '/' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ohaInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const c = spawn('which', ['oha'])
    c.on('exit', (code) => resolve(code === 0))
    c.on('error', () => resolve(false))
  })
}

async function startServer(
  c: Competitor,
  bootWaitMs = 4_000,
): Promise<() => void> {
  const child = spawn('bun', ['run', 'start'], {
    cwd: c.cwd,
    env: { ...process.env, PORT: String(c.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await sleep(bootWaitMs)
  return () => child.kill('SIGTERM')
}

function buildOhaArgs(url: string, s: HttpScenario, seconds: number): string[] {
  const args = ['--json', '-z', `${seconds}s`, '--no-tui']
  if (s.method === 'POST' && s.body !== undefined) {
    const ct = s.contentType ?? 'application/json'
    args.push('-m', 'POST', '-H', `content-type: ${ct}`, '-d', s.body)
  }
  args.push(url)
  return args
}

async function runOhaArgs(
  args: string[],
): Promise<ReturnType<typeof parseOhaJson>> {
  return new Promise((resolve, reject) => {
    const child = spawn('oha', args)
    let stdout = ''
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.on('error', reject)
    child.on('exit', (code: number | null) => {
      if (code !== 0) reject(new Error(`oha exited ${code}`))
      else resolve(parseOhaJson(stdout))
    })
  })
}

function ensureSubset<T>(all: T[], names: string[], key: keyof T): T[] {
  if (names.length === 0) return all
  return all.filter((item) => names.includes(String(item[key])))
}

async function ensureResultsDir(date: string): Promise<string> {
  const dir = resolve(ROOT, 'benchmarks', 'results', date)
  await mkdir(dir, { recursive: true })
  return dir
}

async function writeResult(
  dir: string,
  result: BenchResult,
): Promise<void> {
  const filename = `${result.scenario}-${result.competitor}.json`
  await writeFile(resolve(dir, filename), JSON.stringify(result, null, 2))
}

function placeholder(
  competitor: string,
  scenario: string,
  date: string,
  reason: string,
): BenchResult {
  return {
    competitor,
    date,
    note: reason,
    scenario,
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const date = (process.env.BENCH_DATE ?? new Date().toISOString().slice(0, 10))
  const seconds = Number(process.env.BENCH_SECONDS ?? 10)
  const scenarioFilter = (process.env.BENCH_SCENARIOS ?? '').split(',').filter(Boolean)
  const targetFilter = (process.env.BENCH_TARGETS ?? '').split(',').filter(Boolean)

  const competitors = ensureSubset(ALL_COMPETITORS, targetFilter, 'name')
  const scenarios = ensureSubset(ALL_SCENARIOS, scenarioFilter, 'name')

  const ohaAvailable = await ohaInstalled()
  if (!ohaAvailable) {
    console.log(
      'bench: oha not found — HTTP load-test scenarios will produce placeholder results.',
    )
    console.log(
      'bench: Install oha (https://github.com/hatoo/oha) and re-run for real numbers.',
    )
  }

  const resultsDir = await ensureResultsDir(date)
  console.log(`bench: writing results to ${resultsDir}`)

  for (const scenario of scenarios) {
    console.log(`\n=== scenario: ${scenario.name} ===`)

    for (const competitor of competitors) {
      const label = `${scenario.name}-${competitor.name}`
      console.log(`  ${label}...`)

      try {
        let result: BenchResult

        if (scenario.kind === 'cold-start') {
          // ----------- cold-start -----------
          const r = await measureColdStart(competitor.cwd, competitor.port)
          result = {
            competitor: competitor.name,
            date,
            ...r,
            scenario: scenario.name,
          }
          console.log(`    startup=${r.startupMs} ms (${r.pollAttempts} polls)`)
        } else if (scenario.kind === 'rss-idle') {
          // ----------- rss-idle -----------
          const r = await measureRssIdle(competitor.cwd, competitor.port, 10)
          result = {
            competitor: competitor.name,
            date,
            ...r,
            scenario: scenario.name,
          }
          console.log(`    rss=${r.rssKb} kB`)
        } else if (scenario.kind === 'pending') {
          // ----------- scaffolded, not yet runnable -----------
          result = placeholder(
            competitor.name,
            scenario.name,
            date,
            'scaffolded — results pending Wave 12',
          )
          console.log(`    (pending — skipped)`)
        } else {
          // ----------- HTTP load test -----------
          if (!ohaAvailable) {
            result = placeholder(
              competitor.name,
              scenario.name,
              date,
              'harness only — runner unavailable (oha not installed)',
            )
            console.log(`    (placeholder — oha unavailable)`)
          } else {
            let stop: (() => void) | undefined
            try {
              stop = await startServer(competitor)
              const url = `http://localhost:${competitor.port}${scenario.path}`
              const args = buildOhaArgs(url, scenario, seconds)
              const r = await runOhaArgs(args)
              result = {
                competitor: competitor.name,
                date,
                ...r,
                scenario: scenario.name,
              }
              console.log(
                `    rps=${r.rps.toFixed(0)} p50=${(r.p50 * 1000).toFixed(2)}ms p99=${(r.p99 * 1000).toFixed(2)}ms`,
              )
            } finally {
              stop?.()
            }
          }
        }

        await writeResult(resultsDir, result)
      } catch (err) {
        console.warn(`  warning: ${label} failed — ${err}`)
        const errResult = placeholder(
          competitor.name,
          scenario.name,
          date,
          `error: ${String(err)}`,
        )
        await writeResult(resultsDir, errResult)
      }
    }
  }

  console.log('\nbench: done.')
}

if (import.meta.main) {
  await main()
}
