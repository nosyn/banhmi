import { spawn } from 'node:child_process'

/**
 * Result of a `bombardier` benchmark run.
 */
export type BombardierResult = {
  rps: number
  p50: number
  p95: number
  p99: number
  p99_9: number
  totalSeconds: number
}

/**
 * Parse the JSON output produced by `bombardier --print r --format json`.
 */
export function parseBombardierJson(json: string): BombardierResult {
  const parsed = JSON.parse(json) as {
    result: {
      rps: { mean: number }
      latency: {
        mean: number
        percentiles: {
          50: number
          95: number
          99: number
          99.9?: number
        }
      }
      timeTakenSeconds: number
    }
  }
  const { latency, rps, timeTakenSeconds } = parsed.result
  return {
    p50: latency.percentiles[50] / 1_000_000,
    p95: latency.percentiles[95] / 1_000_000,
    p99: latency.percentiles[99] / 1_000_000,
    p99_9: (latency.percentiles[99.9] ?? latency.percentiles[99]) / 1_000_000,
    rps: rps.mean,
    totalSeconds: timeTakenSeconds,
  }
}

/**
 * Options for a `bombardier` run.
 */
export type BombardierOptions = {
  /** Duration in seconds. */
  seconds: number
  /** Number of concurrent connections (default 125). */
  connections?: number
  /** HTTP method (default GET). */
  method?: 'GET' | 'POST'
  /** Request body to send with POST. */
  body?: string
  /** Content-Type header (default application/json for POST). */
  contentType?: string
}

/**
 * Run `bombardier` against a URL and return the parsed result.
 * Throws if `bombardier` is not installed.
 */
export async function runBombardier(
  url: string,
  opts: BombardierOptions,
): Promise<BombardierResult> {
  const { body, connections = 125, contentType, method = 'GET', seconds } = opts

  const args: string[] = [
    '--print', 'r',
    '--format', 'json',
    '--duration', `${seconds}s`,
    '--connections', String(connections),
  ]

  if (method === 'POST' && body !== undefined) {
    const ct = contentType ?? 'application/json'
    args.push('--method', 'POST', '--body', body, '--header', `Content-Type: ${ct}`)
  }

  args.push(url)

  return new Promise((resolve, reject) => {
    const child = spawn('bombardier', args)
    let stdout = ''
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.on('error', reject)
    child.on('exit', (code: number | null) => {
      if (code !== 0) reject(new Error(`bombardier exited ${code}`))
      else resolve(parseBombardierJson(stdout))
    })
  })
}

/**
 * Check whether `bombardier` is available on PATH.
 */
export async function bombardierInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const c = spawn('which', ['bombardier'])
    c.on('exit', (code) => resolve(code === 0))
    c.on('error', () => resolve(false))
  })
}
