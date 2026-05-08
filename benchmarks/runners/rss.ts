import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

/**
 * Result of an RSS-idle measurement.
 */
export type RssResult = {
  /** RSS in kilobytes after the idle period. */
  rssKb: number
  /** Idle duration in seconds. */
  idleSeconds: number
  /** Process ID of the competitor during the measurement. */
  pid: number
}

/**
 * Read the RSS of a process in kilobytes using `ps -o rss= -p <pid>`.
 * Works on macOS and Linux.
 */
async function readRssKb(pid: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('ps', ['-o', 'rss=', '-p', String(pid)])
    let stdout = ''
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.on('error', reject)
    child.on('exit', () => {
      const kb = Number.parseInt(stdout.trim(), 10)
      if (Number.isNaN(kb)) {
        reject(new Error(`Could not parse RSS from ps output: "${stdout.trim()}"`))
      } else {
        resolve(kb)
      }
    })
  })
}

/**
 * Spawn a competitor process, let it idle for `idleSeconds`, then snapshot RSS.
 *
 * @param cwd - Working directory of the competitor (absolute path).
 * @param port - Port the competitor will listen on.
 * @param idleSeconds - How long to wait before measuring (default 30).
 */
export async function measureRssIdle(
  cwd: string,
  port: number,
  idleSeconds = 30,
): Promise<RssResult> {
  const child = spawn('bun', ['run', 'start'], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const pid = child.pid
  if (pid === undefined) throw new Error('Failed to get competitor PID')

  // Wait for the process to boot and stabilise
  const bootWait = Math.min(5_000, idleSeconds * 1_000)
  await sleep(bootWait)

  // Wait for server to be ready
  const url = `http://localhost:${port}/`
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (res.ok) break
    } catch {
      await sleep(200)
    }
  }

  // Idle for the remaining time
  const elapsed = Math.round(bootWait / 1_000)
  const remaining = idleSeconds - elapsed
  if (remaining > 0) await sleep(remaining * 1_000)

  try {
    const rssKb = await readRssKb(pid)
    return { idleSeconds, pid, rssKb }
  } finally {
    child.kill('SIGTERM')
  }
}
