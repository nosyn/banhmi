import { spawn } from 'node:child_process'

/**
 * Result of an `oha` benchmark run.
 */
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
    p50: parsed.latencyPercentiles.p50,
    p95: parsed.latencyPercentiles.p95,
    p99: parsed.latencyPercentiles.p99,
    rps: parsed.summary.requestsPerSec,
    totalSeconds: parsed.summary.total,
  }
}

/**
 * Run `oha` against a URL for `seconds` and return the parsed result.
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
