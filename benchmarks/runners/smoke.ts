import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseOhaJson } from './oha'

/**
 * Tiny utility used by the test to verify the smoke runner correctly
 * surfaces the resolved `oha` path in its log output.
 */
export const describeOhaCheckPath = (path: string): string =>
  `Will use oha at ${path}`

/**
 * A benchmark scenario — a named HTTP endpoint to exercise per competitor.
 */
type Scenario = {
  /** Human-readable name used in result filenames. */
  name: string
  /** Path relative to the competitor's base URL. */
  path: string
  /** HTTP method (default GET). */
  method?: 'GET' | 'POST'
  /** Optional JSON body to send with POST requests. */
  body?: string
  /** Content-Type header (defaults to application/json for POST). */
  contentType?: string
}

/**
 * Benchmark scenarios for Wave 1.
 *
 * hello     — baseline GET /
 * json      — POST / echo JSON body
 * validate  — POST / validate 10-field DTO
 * upload    — POST / multipart file upload (5 KB)
 */
const SCENARIOS: Scenario[] = [
  { name: 'hello', path: '/', method: 'GET' },
  {
    name: 'json',
    path: '/json',
    method: 'POST',
    body: JSON.stringify({
      key: 'value',
      number: 42,
      nested: { a: 1, b: 2 },
    }),
  },
  {
    name: 'validate',
    path: '/validate',
    method: 'POST',
    body: JSON.stringify({
      f1: 'foo',
      f2: 'bar',
      f3: 'baz',
      f4: 'qux',
      f5: 'quux',
      n1: 1,
      n2: 2,
      n3: 3,
      n4: 4,
      n5: 5,
    }),
  },
]

type Competitor = {
  name: string
  cwd: string
  port: number
}

const COMPETITORS: Competitor[] = [
  { cwd: 'benchmarks/competitors/banhmi', name: 'banhmi', port: 3001 },
  {
    cwd: 'benchmarks/competitors/nestjs-express',
    name: 'nestjs-express',
    port: 3002,
  },
  {
    cwd: 'benchmarks/competitors/nestjs-fastify',
    name: 'nestjs-fastify',
    port: 3003,
  },
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
  // Give NestJS extra time to bootstrap
  await sleep(3_000)
  return () => child.kill('SIGTERM')
}

/**
 * Build the `oha` arguments for a given scenario.
 * POST scenarios send a JSON body; GET scenarios are plain fetches.
 */
function buildOhaArgs(
  url: string,
  scenario: Scenario,
  seconds: number,
): string[] {
  const args = ['--json', '-z', `${seconds}s`, '--no-tui']

  if (scenario.method === 'POST' && scenario.body !== undefined) {
    const ct = scenario.contentType ?? 'application/json'
    args.push('-m', 'POST', '-H', `content-type: ${ct}`, '-d', scenario.body)
  }

  args.push(url)
  return args
}

/**
 * Run oha with custom arguments and return the parsed result.
 */
async function runOhaArgs(args: string[]): Promise<import('./oha').OhaResult> {
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

async function ensureResultsDir(date: string): Promise<string> {
  const dir = join('benchmarks', 'results', date)
  await mkdir(dir, { recursive: true })
  return dir
}

async function main(): Promise<number> {
  if (!(await ohaInstalled())) {
    console.log(
      'smoke: skipping — oha not installed (install with `brew install oha`)',
    )
    return 0
  }

  const date = new Date().toISOString().slice(0, 10)
  const resultsDir = await ensureResultsDir(date)

  const stops: Array<() => void> = []
  try {
    for (const c of COMPETITORS) {
      stops.push(await startServer(c))

      for (const scenario of SCENARIOS) {
        const url = `http://localhost:${c.port}${scenario.path}`
        const args = buildOhaArgs(url, scenario, 3)

        try {
          const r = await runOhaArgs(args)
          const label = `${c.name}-${scenario.name}`
          console.log(
            `${label}: ${r.rps.toFixed(0)} rps p99=${(r.p99 * 1000).toFixed(2)}ms`,
          )

          const resultPath = join(resultsDir, `${label}.json`)
          await writeFile(
            resultPath,
            JSON.stringify(
              { competitor: c.name, scenario: scenario.name, date, ...r },
              null,
              2,
            ),
          )
        } catch (err) {
          console.warn(
            `  warning: scenario ${scenario.name} failed for ${c.name}: ${err}`,
          )
        }
      }
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
