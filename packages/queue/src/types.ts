/**
 * Options passed to {@link Queue.add} to control job behaviour.
 *
 * @example
 * await queue.add('send', { to: 'user@example.com' }, { attempts: 3, delay: 500 })
 */
export type JobOptions = {
  /** Milliseconds to wait before the job becomes eligible for processing. */
  delay?: number
  /** Total number of processing attempts including the first. Defaults to `1`. */
  attempts?: number
  /**
   * Back-off strategy applied between retries.
   *
   * @example
   * { type: 'exponential', delay: 1000 }
   */
  backoff?: { type: 'exponential' | 'fixed'; delay: number }
  /** Optional explicit job identifier. Generated via `crypto.randomUUID()` when absent. */
  jobId?: string
}

/**
 * A job as stored and returned to processor handlers.
 *
 * @example
 * const job: Job<{ to: string }> = {
 *   id: 'abc123',
 *   name: 'send',
 *   data: { to: 'user@example.com' },
 *   attemptsMade: 0,
 *   createdAt: Date.now(),
 * }
 */
export type Job<TData = unknown> = {
  /** Unique identifier for this job. */
  id: string
  /** Job name (matches the `@Process` handler). */
  name: string
  /** Application-defined payload. */
  data: TData
  /** Number of processing attempts already made (0-based before first attempt). */
  attemptsMade: number
  /** Unix timestamp (ms) when the job was created. */
  createdAt: number
  /** Unix timestamp (ms) when processing started, if applicable. */
  processedAt?: number
}

/**
 * Context object passed to `@Process`-decorated handlers.
 *
 * @example
 * \@Process('send')
 * async send(ctx: ProcessorContext<{ to: string }>) {
 *   ctx.log(`Sending to ${ctx.job.data.to}`)
 * }
 */
export type ProcessorContext<TData = unknown> = {
  /** The job being processed. */
  job: Job<TData>
  /**
   * Write a log line tied to this job.
   *
   * @param msg - Human-readable message.
   */
  log(msg: string): void
}

/**
 * Options supplied to {@link QueueModule.forRoot} or
 * {@link QueueModule.registerQueue}.
 *
 * @example
 * QueueModule.registerQueue({ name: 'emails', redis: { host: 'localhost', port: 6379 } })
 */
export type QueueOptions = {
  /** Queue name — must match the `@Processor(name)` value. */
  name: string
}
