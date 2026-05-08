/**
 * Integration tests for the scheduling-queues cluster example.
 *
 * Tests are designed to pass regardless of whether a Redis instance is
 * available:
 * - When Redis IS available: all tests run including queue E2E.
 * - When Redis is NOT available: queue-dependent tests are skipped cleanly;
 *   logger, scheduling, devtools, and event tests still run using a mock Redis.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { BanhmiApplication } from '@banhmi/core'
import { DevtoolsModule } from '@banhmi/devtools'
import {
  EVENT_EMITTER_TOKEN,
  type EventEmitter,
  EventEmitterModule,
} from '@banhmi/events'
import type { Logger, LogRecord, LogTransport } from '@banhmi/logger'
import {
  createChildLoggerProvider,
  InjectLogger,
  LoggerModule,
} from '@banhmi/logger'
import { BanhmiFactory } from '@banhmi/platform-bun'
import type { ProcessorContext, Queue } from '@banhmi/queue'
import { InjectQueue, Process, Processor, QueueModule } from '@banhmi/queue'
import { REDIS_TOKEN, RedisModule } from '@banhmi/redis'
import { Interval, ScheduleModule } from '@banhmi/scheduling'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, HttpCode, Injectable, Module, Post } from 'banhmi'
import type { Redis } from 'ioredis'

// ─── In-memory mock Redis for queue operations ──────────────────────────────

type MockRedisMap = Record<string, Record<string, string>>

function makeMockRedis() {
  const data: MockRedisMap = {}
  const waitingLists: Record<string, string[]> = {}
  const delayedSets: Record<string, Array<{ score: number; id: string }>> = {}

  return {
    _data: data,
    _waiting: waitingLists,
    _delayed: delayedSets,

    async hset(key: string, fields: Record<string, string>) {
      data[key] = { ...(data[key] ?? {}), ...fields }
      return 1
    },
    async hgetall(key: string) {
      return data[key] ?? null
    },
    async lpush(key: string, ...ids: string[]) {
      if (!waitingLists[key]) waitingLists[key] = []
      waitingLists[key].unshift(...ids)
      return waitingLists[key].length
    },
    async rpop(key: string) {
      const list = waitingLists[key]
      if (!list || list.length === 0) return null
      return list.pop() ?? null
    },
    async zadd(key: string, score: number, id: string) {
      if (!delayedSets[key]) delayedSets[key] = []
      delayedSets[key].push({ score, id })
      return 1
    },
    async zrangebyscore(key: string, _min: string, max: number) {
      const set = delayedSets[key]
      if (!set) return []
      return set.filter((e) => e.score <= max).map((e) => e.id)
    },
    async zrem(key: string, id: string) {
      const set = delayedSets[key]
      if (!set) return 0
      const idx = set.findIndex((e) => e.id === id)
      if (idx >= 0) set.splice(idx, 1)
      return 1
    },
    disconnect() {},
    quit() {
      return Promise.resolve()
    },
  }
}

// ─── Test transport that captures log records in memory ─────────────────────

const capturedLogs: LogRecord[] = []

const captureTransport: LogTransport = {
  write(record) {
    capturedLogs.push(record)
  },
}

// ─── Probe whether Redis is reachable ────────────────────────────────────────

async function isRedisAvailable(): Promise<boolean> {
  try {
    const { default: IORedis } = await import('ioredis')
    const r = new IORedis(Bun.env.REDIS_URL ?? 'redis://localhost:6379', {
      connectTimeout: 500,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    })
    await r.connect()
    await r.ping()
    r.disconnect()
    return true
  } catch {
    return false
  }
}

// ─── Test app fixtures ───────────────────────────────────────────────────────

/** Events captured from the shared emitter. */
const capturedEvents: unknown[] = []

/** In-memory sent-email store used by both service and tests. */
const testSent: Array<{ id: string; to: string; subject: string }> = []

@Injectable()
class TestEmailService {
  static inject = [] as const

  record(entry: { id: string; to: string; subject: string }): void {
    testSent.push(entry)
  }

  listSent() {
    return [...testSent]
  }
}

@Injectable()
@Processor('emails')
class TestEmailProcessor {
  static inject = [TestEmailService, EVENT_EMITTER_TOKEN] as const

  constructor(
    private readonly emailService: TestEmailService,
    private readonly emitter: EventEmitter,
  ) {}

  @Process('send')
  async sendEmail(
    ctx: ProcessorContext<{ to: string; subject: string }>,
  ): Promise<void> {
    const { to, subject } = ctx.job.data
    await new Promise<void>((resolve) => setTimeout(resolve, 5))
    const entry = { id: ctx.job.id, to, subject }
    this.emailService.record(entry)
    this.emitter.emit('email.sent', entry)
  }
}

/** Heartbeat fires every 100ms so tests can observe it quickly. */
const heartbeatCount = { value: 0 }

@Injectable()
class TestHeartbeatService {
  static inject = [InjectLogger('HeartbeatService')] as const

  constructor(private readonly logger: Logger) {}

  @Interval(100)
  tick(): void {
    heartbeatCount.value++
    this.logger.info('heartbeat')
  }
}

@Controller('/email')
class TestEmailController {
  static inject = [TestEmailService, InjectQueue('emails')] as const

  constructor(
    private readonly emailService: TestEmailService,
    private readonly emailQueue: Queue<{ to: string; subject: string }>,
  ) {}

  @Post()
  @HttpCode(202)
  async enqueue(ctx: RouteCtx): Promise<{ id: string }> {
    const body = await ctx.json<{ to: string; subject: string }>()
    const job = await this.emailQueue.add('send', {
      to: body.to,
      subject: body.subject,
    })
    return { id: job.id }
  }

  @Get('/sent')
  listSent() {
    return this.emailService.listSent()
  }
}

@Module({
  controllers: [TestEmailController],
  providers: [TestEmailService, TestEmailProcessor],
  exports: [TestEmailService],
})
class TestEmailModule {}

// ─── Build the app, optionally injecting a mock Redis ───────────────────────

function buildAppModule(mockRedis: ReturnType<typeof makeMockRedis> | null) {
  const redisToken = Symbol.for('banhmi:queue-redis:emails')

  if (mockRedis !== null) {
    // Override both the root REDIS_TOKEN and the queue-dedicated redis token
    // with the in-memory mock so ioredis is never contacted.
    @Module({
      imports: [
        LoggerModule.forRoot({ level: 'info', transports: [captureTransport] }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        // No real Redis — provide mock directly
        QueueModule.registerQueue({ name: 'emails' }),
        DevtoolsModule.forRoot({ enabled: true }),
        TestEmailModule,
      ],
      providers: [
        TestHeartbeatService,
        createChildLoggerProvider('HeartbeatService'),
        // Override the REDIS_TOKEN so any code that injects it gets the mock
        { provide: REDIS_TOKEN, useValue: mockRedis as unknown as Redis },
        // Override the queue-dedicated redis token
        { provide: redisToken, useValue: mockRedis as unknown as Redis },
      ],
    })
    class TestAppModuleMock {}
    return TestAppModuleMock
  }

  // Real Redis path
  @Module({
    imports: [
      LoggerModule.forRoot({ level: 'info', transports: [captureTransport] }),
      EventEmitterModule.forRoot(),
      ScheduleModule.forRoot(),
      RedisModule.forRoot(Bun.env.REDIS_URL ?? 'redis://localhost:6379'),
      QueueModule.registerQueue({ name: 'emails' }),
      DevtoolsModule.forRoot({ enabled: true }),
      TestEmailModule,
    ],
    providers: [
      TestHeartbeatService,
      createChildLoggerProvider('HeartbeatService'),
    ],
  })
  class TestAppModuleReal {}
  return TestAppModuleReal
}

// ─── Suite setup ─────────────────────────────────────────────────────────────

let app: BanhmiApplication
let base: string
let redisAvailable = false
let mockRedis: ReturnType<typeof makeMockRedis> | null = null

beforeAll(async () => {
  // Reset shared state
  testSent.length = 0
  capturedLogs.length = 0
  capturedEvents.length = 0
  heartbeatCount.value = 0

  redisAvailable = await isRedisAvailable()

  if (!redisAvailable) {
    mockRedis = makeMockRedis()
    console.log(
      '[info] Redis unavailable — using in-memory mock Redis for queue operations',
    )
  }

  const AppModule = buildAppModule(redisAvailable ? null : mockRedis)
  app = await BanhmiFactory.create(AppModule)

  // Subscribe to email.sent events via the shared emitter
  const emitter = app.container.resolve(EVENT_EMITTER_TOKEN) as EventEmitter
  emitter.on('email.sent', (payload) => {
    capturedEvents.push(payload)
  })

  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// ─── Test 1: Devtools graph endpoint includes expected modules ───────────────

test('GET /__banhmi/devtools/graph.json returns a valid DI graph', async () => {
  const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
  expect(res.status).toBe(200)

  const graph = (await res.json()) as {
    nodes: Array<{ name: string; kind: string }>
    edges: unknown[]
  }
  expect(Array.isArray(graph.nodes)).toBe(true)
  expect(Array.isArray(graph.edges)).toBe(true)
  expect(graph.nodes.length).toBeGreaterThan(0)

  // Should include a module or provider related to email
  const names = graph.nodes.map((n) => n.name)
  expect(
    names.some((n) => n.includes('Email') || n.includes('Heartbeat')),
  ).toBe(true)
})

// ─── Test 2: Heartbeat service logs at the configured interval ───────────────

test('heartbeat service emits info logs via the injected logger', async () => {
  // Wait long enough for at least 2 ticks at 100ms interval
  await new Promise<void>((resolve) => setTimeout(resolve, 350))

  const heartbeatLogs = capturedLogs.filter(
    (r) => r.msg === 'heartbeat' && r.level === 'info',
  )
  expect(heartbeatLogs.length).toBeGreaterThanOrEqual(1)
})

// ─── Test 3: POST /email enqueues a job ──────────────────────────────────────

test('POST /email returns a job id', async () => {
  const res = await fetch(`${base}/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      to: 'test@example.com',
      subject: 'Hello from integration test',
    }),
  })
  expect(res.status).toBe(202)
  const body = (await res.json()) as { id: string }
  expect(typeof body.id).toBe('string')
  expect(body.id.length).toBeGreaterThan(0)
})

// ─── Test 4: GET /email/sent returns array ───────────────────────────────────

test('GET /email/sent returns an array', async () => {
  const res = await fetch(`${base}/email/sent`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as unknown[]
  expect(Array.isArray(body)).toBe(true)
})

// ─── Test 5: Queue end-to-end — job processed, event fired ──────────────────

describe('email queue end-to-end', () => {
  test('processed job appears in /email/sent and fires email.sent event', async () => {
    testSent.length = 0
    capturedEvents.length = 0

    const res = await fetch(`${base}/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        to: 'queue-test@example.com',
        subject: 'Queue E2E',
      }),
    })
    expect(res.status).toBe(202)
    const { id } = (await res.json()) as { id: string }
    expect(typeof id).toBe('string')

    // Poll GET /email/sent until the job shows up (worker polls every 100ms)
    const deadline = Date.now() + 3000
    let found = false
    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 150))
      const listRes = await fetch(`${base}/email/sent`)
      const sent = (await listRes.json()) as Array<{ id: string }>
      if (sent.some((s) => s.id === id)) {
        found = true
        break
      }
    }

    expect(found).toBe(true)

    // The email.sent event must have been captured
    const matchingEvent = capturedEvents.find(
      (e) => (e as { id: string }).id === id,
    )
    expect(matchingEvent).toBeDefined()
  })
})
