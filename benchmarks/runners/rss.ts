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
 * Find the PID of the process listening on a given port using `lsof`.
 * Returns null if not found.
 */
async function findPidByPort(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn('lsof', ['-t', '-i', `TCP:${port}`, '-sTCP:LISTEN'])
    let stdout = ''
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.on('error', () => resolve(null))
    child.on('exit', () => {
      const pid = Number.parseInt(stdout.trim().split('\n')[0] ?? '', 10)
      resolve(Number.isNaN(pid) ? null : pid)
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

  const spawnedPid = child.pid
  if (spawnedPid === undefined) throw new Error('Failed to get competitor PID')

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

  // Resolve the actual listening PID (may differ from spawned PID under `bun run`)
  const listeningPid = (await findPidByPort(port)) ?? spawnedPid

  // Idle for the remaining time
  await sleep(idleSeconds * 1_000)

  try {
    const rssKb = await readRssKb(listeningPid)
    return { idleSeconds, pid: listeningPid, rssKb }
  } finally {
    child.kill('SIGTERM')
    // Also kill the listening process if it differs from the spawned one
    if (listeningPid !== spawnedPid) {
      try {
        process.kill(listeningPid, 'SIGTERM')
      } catch {
        // best-effort
      }
    }
  }
}
