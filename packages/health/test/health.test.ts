import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory, Module } from 'banhmi'
import { HealthModule } from '../src/health.module'
import { customIndicator } from '../src/indicators/custom'
import { memoryIndicator } from '../src/indicators/memory'
import type { HealthCheckResult } from '../src/types'

// ---------------------------------------------------------------------------
// Unit: memoryIndicator
// ---------------------------------------------------------------------------

test('memoryIndicator: reports up when heap is below threshold', async () => {
  const indicator = memoryIndicator({ heapUsedThresholdMb: 100_000 }) // extremely high
  const result = await indicator()
  expect(result.status).toBe('up')
  expect(result.details?.heapUsedMb).toBeGreaterThan(0)
})

test('memoryIndicator: reports down when threshold is exceeded', async () => {
  const indicator = memoryIndicator({ heapUsedThresholdMb: 0 }) // always fails
  const result = await indicator()
  expect(result.status).toBe('down')
  expect(result.details?.thresholdMb).toBe(0)
})

// ---------------------------------------------------------------------------
// Unit: customIndicator
// ---------------------------------------------------------------------------

test('customIndicator: propagates up result', async () => {
  const indicator = customIndicator(async () => ({
    status: 'up',
    details: { version: '1.0.0' },
  }))
  const result = await indicator()
  expect(result.status).toBe('up')
  expect(result.details?.version).toBe('1.0.0')
})

test('customIndicator: propagates down result', async () => {
  const indicator = customIndicator(async () => ({ status: 'down' }))
  const result = await indicator()
  expect(result.status).toBe('down')
})

test('customIndicator: catches thrown errors and reports down', async () => {
  const indicator = customIndicator(async () => {
    throw new Error('connection refused')
  })
  const result = await indicator()
  expect(result.status).toBe('down')
  expect(String(result.details?.error)).toContain('connection refused')
})

// ---------------------------------------------------------------------------
// Integration: HealthModule mounts endpoint
// ---------------------------------------------------------------------------

let app: BanhmiApplication
let base: string

const upIndicator = customIndicator(async () => ({ status: 'up' }))
const downIndicator = customIndicator(async () => ({
  status: 'down',
  details: { reason: 'test' },
}))

beforeAll(async () => {
  @Module({
    imports: [
      HealthModule.forRoot({
        path: '/health',
        indicators: {
          db: upIndicator,
          memory: memoryIndicator({ heapUsedThresholdMb: 100_000 }),
        },
      }),
    ],
  })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

test('health endpoint: all up → 200 with status up', async () => {
  const res = await fetch(`${base}/health`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as HealthCheckResult
  expect(body.status).toBe('up')
  expect(body.details.db.status).toBe('up')
  expect(body.details.memory.status).toBe('up')
})

test('health endpoint: returns JSON content-type', async () => {
  const res = await fetch(`${base}/health`)
  expect(res.headers.get('content-type')).toContain('application/json')
})

test('health endpoint: one down → 503 + correct details', async () => {
  let app2: BanhmiApplication | null = null
  try {
    @Module({
      imports: [
        HealthModule.forRoot({
          path: '/health',
          indicators: {
            ok: upIndicator,
            failing: downIndicator,
          },
        }),
      ],
    })
    class App2Module {}

    app2 = await BanhmiFactory.create(App2Module)
    await app2.listen(0)
    const base2 = app2.getUrl()

    const res = await fetch(`${base2}/health`)
    expect(res.status).toBe(503)
    const body = (await res.json()) as HealthCheckResult
    expect(body.status).toBe('down')
    expect(body.details.ok.status).toBe('up')
    expect(body.details.failing.status).toBe('down')
  } finally {
    await app2?.close()
  }
})

test('health endpoint: non-health paths pass through to 404', async () => {
  const res = await fetch(`${base}/other`)
  expect(res.status).toBe(404)
})
