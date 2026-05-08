import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

/**
 * Result of a cold-start measurement.
 */
export type ColdStartResult = {
  /** Milliseconds from process spawn to first successful GET /. */
  startupMs: number
  /** HTTP status of the first successful response. */
  firstStatus: number
  /** Number of poll attempts before success. */
  pollAttempts: number
}

/**
 * Spawn a competitor process and measure the time to the first 200 OK on GET /.
 *
 * @param cwd - Working directory of the competitor (absolute path).
 * @param port - Port the competitor will listen on.
 * @param maxWaitMs - Maximum time to wait before giving up (default 15 000 ms).
 * @param pollIntervalMs - Time between poll attempts (default 100 ms).
 */
export async function measureColdStart(
  cwd: string,
  port: number,
  maxWaitMs = 15_000,
  pollIntervalMs = 100,
): Promise<ColdStartResult> {
  const startTime = Date.now()

  const child = spawn('bun', ['run', 'start'], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let pollAttempts = 0
  const url = `http://localhost:${port}/`

  try {
    while (Date.now() - startTime < maxWaitMs) {
      pollAttempts++
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(200) })
        if (res.ok || res.status < 500) {
          const startupMs = Date.now() - startTime
          return { firstStatus: res.status, pollAttempts, startupMs }
        }
      } catch {
        // Server not ready yet — keep polling
      }
      await sleep(pollIntervalMs)
    }
    throw new Error(`Competitor did not respond within ${maxWaitMs} ms`)
  } finally {
    child.kill('SIGTERM')
  }
}
