import type { RedisLike } from '@banhmi/redis'
import type { Job, JobOptions } from './types'

/**
 * Redis-backed job queue producer.
 *
 * Use `add()` to enqueue jobs. Jobs are stored in a Redis hash
 * (`<name>:job:<id>`) and either pushed to the waiting list immediately or
 * added to a delayed sorted set when `opts.delay > 0`.
 *
 * Obtain a `Queue` instance via `@InjectQueue(name)` or from
 * `QueueModule.registerQueue({ name })`.
 *
 * @example
 * class EmailService {
 *   static inject = [getQueueToken('emails')] as const
 *   constructor(private readonly queue: Queue<{ to: string }>) {}
 *
 *   async sendWelcome(to: string) {
 *     await this.queue.add('send', { to })
 *   }
 * }
 */
export class Queue<TData = unknown> {
  /**
   * @param name - Logical queue name; used as Redis key prefix.
   * @param redis - `RedisLike` client instance.
   */
  constructor(
    readonly name: string,
    private readonly redis: RedisLike,
  ) {}

  /**
   * Add a job to the queue.
   *
   * - When `opts.delay` is set the job lands in the delayed sorted set and
   *   becomes eligible after `Date.now() + delay` ms.
   * - Otherwise the job is LPUSH'd onto the waiting list for immediate
   *   processing.
   *
   * @param jobName - Logical job type; matched by `@Process(jobName)`.
   * @param data - Arbitrary job payload.
   * @param opts - Optional {@link JobOptions}.
   * @returns The created {@link Job}.
   *
   * @example
   * const job = await queue.add('send', { to: 'user@example.com' })
   * const delayed = await queue.add('remind', {}, { delay: 60_000 })
   */
  async add(
    jobName: string,
    data: TData,
    opts: JobOptions = {},
  ): Promise<Job<TData>> {
    const id = opts.jobId ?? crypto.randomUUID()
    const now = Date.now()
    const attempts = opts.attempts ?? 1
    const backoffType = opts.backoff?.type ?? 'fixed'
    const backoffDelay = opts.backoff?.delay ?? 0

    const job: Job<TData> = {
      id,
      name: jobName,
      data,
      attemptsMade: 0,
      createdAt: now,
    }

    const hashKey = `${this.name}:job:${id}`
    const hashData: Record<string, string> = {
      id,
      name: jobName,
      data: JSON.stringify(data),
      attemptsMade: '0',
      createdAt: String(now),
      attempts: String(attempts),
      backoffType,
      backoffDelay: String(backoffDelay),
    }

    await this.redis.hset(hashKey, hashData)

    if (opts.delay && opts.delay > 0) {
      const runAt = now + opts.delay
      await this.redis.zadd(`${this.name}:delayed`, runAt, id)
    } else {
      await this.redis.lpush(`${this.name}:waiting`, id)
    }

    return job
  }
}
