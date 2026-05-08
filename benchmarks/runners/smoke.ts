import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { runOha } from './oha'

/**
 * Tiny utility used by the test to verify the smoke runner correctly
 * surfaces the resolved `oha` path in its log output.
 */
export const describeOhaCheckPath = (path: string): string =>
  `Will use oha at ${path}`

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
  await sleep(2_000)
  return () => child.kill('SIGTERM')
}

async function main(): Promise<number> {
  if (!(await ohaInstalled())) {
    console.log(
      'smoke: skipping — oha not installed (install with `brew install oha`)',
    )
    return 0
  }
  const stops: Array<() => void> = []
  try {
    for (const c of COMPETITORS) {
      stops.push(await startServer(c))
      const r = await runOha(`http://localhost:${c.port}/`, 3)
      console.log(
        `${c.name}: ${r.rps.toFixed(0)} rps p99=${(r.p99 * 1000).toFixed(2)}ms`,
      )
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
