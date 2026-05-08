import { spawn } from 'node:child_process'

/**
 * Result of an `autocannon` benchmark run.
 */
export type AutocannonResult = {
  rps: number
  p50: number
  p95: number
  p99: number
  /** autocannon does not emit p99.9; falls back to p99. */
  p99_9: number
  totalSeconds: number
}

/**
 * Parse the JSON output produced by `autocannon --json`.
 */
export function parseAutocannonJson(json: string): AutocannonResult {
  const parsed = JSON.parse(json) as {
    requests: { mean: number }
    latency: { p50: number; p97_5: number; p99: number }
    duration: number
  }
  // autocannon exposes p97.5 as the closest to p95; p99 is available
  return {
    p50: parsed.latency.p50 / 1_000,
    p95: parsed.latency.p97_5 / 1_000,
    p99: parsed.latency.p99 / 1_000,
    p99_9: parsed.latency.p99 / 1_000,
    rps: parsed.requests.mean,
    totalSeconds: parsed.duration,
  }
}

/**
 * Options for an `autocannon` run.
 */
export type AutocannonOptions = {
  /** Duration in seconds. */
  seconds: number
  /** Number of concurrent connections (default 10). */
  connections?: number
  /** HTTP method (default GET). */
  method?: 'GET' | 'POST'
  /** Request body to send with POST. */
  body?: string
  /** Content-Type header (default application/json for POST). */
  contentType?: string
}

/**
 * Run `autocannon` against a URL and return the parsed result.
 * Throws if `autocannon` is not installed.
 */
export async function runAutocannon(
  url: string,
  opts: AutocannonOptions,
): Promise<AutocannonResult> {
  const { body, connections = 10, contentType, method = 'GET', seconds } = opts

  const args: string[] = [
    '--json',
    '--duration', String(seconds),
    '--connections', String(connections),
  ]

  if (method === 'POST' && body !== undefined) {
    const ct = contentType ?? 'application/json'
    args.push('--method', 'POST', '--body', body, '--header', `Content-Type: ${ct}`)
  }

  args.push(url)

  return new Promise((resolve, reject) => {
    const child = spawn('autocannon', args)
    let stdout = ''
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.on('error', reject)
    child.on('exit', (code: number | null) => {
      if (code !== 0) reject(new Error(`autocannon exited ${code}`))
      else resolve(parseAutocannonJson(stdout))
    })
  })
}

/**
 * Check whether `autocannon` is available on PATH.
 */
export async function autocannonInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const c = spawn('which', ['autocannon'])
    c.on('exit', (code) => resolve(code === 0))
    c.on('error', () => resolve(false))
  })
}
