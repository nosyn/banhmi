import type { Redis } from 'ioredis'
import type { ProcessHandlerEntry } from './metadata'
import { PROCESS_METADATA } from './metadata'
import type { Job, ProcessorContext } from './types'

/** Internal representation of a parsed job stored in Redis. */
type RawJob = {
  id: string
  name: string
  data: string
  attemptsMade: string
  createdAt: string
  attempts: string
  backoffType: string
  backoffDelay: string
}

/**
 * Redis-backed job consumer.
 *
 * A `Worker` is created automatically by the queue explorer for each
 * `@Processor`-decorated class. It polls the waiting list, promotes ready
 * delayed jobs, and dispatches to the matched `@Process` handler.
 *
 * On failure the job is retried up to `opts.attempts` times using the
 * configured back-off strategy; after exhausting retries it is marked
 * `failed`.
 *
 * @example
 * // Manual usage (typically you rely on the explorer instead):
 * const worker = new Worker('emails', redis, processorInstance, MyProcessor)
 * worker.start()
 * // ... later:
 * await worker.stop()
 */
export class Worker {
  private running = false
  private loopPromise: Promise<void> | undefined

  /**
   * @param queueName - Name of the queue to consume from.
   * @param redis - ioredis client instance (dedicated — not shared with producers).
   * @param processorInstance - Instance of the `@Processor` class.
   * @param processorClass - Constructor of the `@Processor` class (for metadata).
   * @param pollIntervalMs - How long to wait between polls when no job is ready (default 100ms).
   */
  constructor(
    private readonly queueName: string,
    private readonly redis: Redis,
    private readonly processorInstance: object,
    private readonly processorClass: new (...args: unknown[]) => unknown,
    private readonly pollIntervalMs = 100,
  ) {}

  /**
   * Start the worker poll loop in the background.
   *
   * @example
   * worker.start()
   */
  start(): void {
    this.running = true
    this.loopPromise = this.loop()
  }

  /**
   * Gracefully stop the worker loop and wait for the current job (if any) to
   * finish.
   *
   * @example
   * await worker.stop()
   */
  async stop(): Promise<void> {
    this.running = false
    await this.loopPromise
  }

  private async loop(): Promise<void> {
    while (this.running) {
      await this.promoteDelayed()
      const jobId = await this.popWaiting()
      if (jobId) {
        await this.processJob(jobId)
      } else {
        await this.sleep(this.pollIntervalMs)
      }
    }
  }

  private async promoteDelayed(): Promise<void> {
    const now = Date.now()
    const ready = await this.redis.zrangebyscore(
      `${this.queueName}:delayed`,
      '-inf',
      now,
    )
    for (const id of ready) {
      await this.redis.zrem(`${this.queueName}:delayed`, id)
      await this.redis.lpush(`${this.queueName}:waiting`, id)
    }
  }

  private async popWaiting(): Promise<string | null> {
    const result = await this.redis.rpop(`${this.queueName}:waiting`)
    return result ?? null
  }

  private async processJob(jobId: string): Promise<void> {
    const hashKey = `${this.queueName}:job:${jobId}`
    const raw = (await this.redis.hgetall(hashKey)) as unknown as RawJob | null

    if (!raw || !raw.id) return

    const job: Job<unknown> = {
      id: raw.id,
      name: raw.name,
      data: JSON.parse(raw.data),
      attemptsMade: Number(raw.attemptsMade),
      createdAt: Number(raw.createdAt),
      processedAt: Date.now(),
    }

    await this.redis.hset(hashKey, { processedAt: String(job.processedAt) })

    const handler = this.findHandler(job.name)
    if (!handler) {
      await this.redis.hset(hashKey, {
        status: 'failed',
        error: `No handler for job "${job.name}"`,
      })
      return
    }

    const ctx: ProcessorContext<unknown> = {
      job,
      log: (msg: string) =>
        console.log(`[queue:${this.queueName}][${job.id}] ${msg}`),
    }

    try {
      await (
        this.processorInstance as Record<
          string,
          (ctx: ProcessorContext<unknown>) => unknown
        >
      )[handler]?.(ctx)
      await this.redis.hset(hashKey, { status: 'completed' })
    } catch (err) {
      const attemptsMade = job.attemptsMade + 1
      const maxAttempts = Number(raw.attempts)
      await this.redis.hset(hashKey, { attemptsMade: String(attemptsMade) })

      if (attemptsMade < maxAttempts) {
        const delay = this.calculateBackoff(
          raw.backoffType,
          Number(raw.backoffDelay),
          attemptsMade,
        )
        if (delay > 0) {
          const runAt = Date.now() + delay
          await this.redis.zadd(`${this.queueName}:delayed`, runAt, jobId)
        } else {
          await this.redis.lpush(`${this.queueName}:waiting`, jobId)
        }
      } else {
        const message = err instanceof Error ? err.message : String(err)
        await this.redis.hset(hashKey, { status: 'failed', error: message })
      }
    }
  }

  private findHandler(jobName: string): string | undefined {
    const meta = (
      this.processorClass as { [Symbol.metadata]?: Record<symbol, unknown> }
    )[Symbol.metadata]
    if (!meta) return undefined

    const entries = meta[PROCESS_METADATA] as ProcessHandlerEntry[] | undefined
    if (!entries) return undefined

    const named = entries.find((e) => e.jobName === jobName)
    if (named) return named.methodName

    const catchAll = entries.find((e) => e.jobName === undefined)
    return catchAll?.methodName
  }

  private calculateBackoff(
    type: string,
    delay: number,
    attemptsMade: number,
  ): number {
    if (delay <= 0) return 0
    if (type === 'exponential') {
      return delay * 2 ** (attemptsMade - 1)
    }
    return delay
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
