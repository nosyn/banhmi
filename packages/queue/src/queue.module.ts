import { Module } from '@banhmi/common'
import { REDIS_TOKEN } from '@banhmi/redis'
import type { Redis } from 'ioredis'
import { QueueExplorerService } from './explorer'
import { Queue } from './queue'
import { getQueueToken, QUEUE_OPTIONS } from './tokens'
import type { QueueOptions } from './types'

/**
 * Module that registers named queues and starts their workers at bootstrap.
 *
 * Use {@link QueueModule.registerQueue} for each queue name your application
 * produces or consumes. Then decorate processor classes with `@Processor` and
 * handler methods with `@Process`.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { QueueModule } from '@banhmi/queue'
 * import { RedisModule } from '@banhmi/redis'
 * import { EmailProcessor } from './email.processor'
 *
 * \@Module({
 *   imports: [
 *     RedisModule.forRoot('redis://localhost:6379'),
 *     QueueModule.registerQueue({ name: 'emails' }),
 *   ],
 *   providers: [EmailProcessor],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class QueueModule {
  /**
   * Register a named queue. Returns a module that provides:
   * - A `Queue` instance under the token returned by `getQueueToken(name)`.
   * - A Redis client dedicated to this queue (cloned from the root
   *   `REDIS_TOKEN`).
   * - The `QueueExplorerService` that starts workers at bootstrap.
   *
   * @param opts - {@link QueueOptions} — at minimum `{ name }`.
   *
   * @example
   * QueueModule.registerQueue({ name: 'emails' })
   */
  static registerQueue(opts: QueueOptions) {
    const queueToken = getQueueToken(opts.name)
    const redisToken = Symbol.for(`banhmi:queue-redis:${opts.name}`)

    @Module({
      providers: [
        // dedicated redis connection for this queue
        {
          provide: redisToken,
          useFactory: (redis: Redis) => redis,
          inject: [REDIS_TOKEN],
        },
        // the Queue producer
        {
          provide: queueToken,
          useFactory: (redis: Redis) => new Queue(opts.name, redis),
          inject: [redisToken],
        },
        // queue options for the explorer
        {
          provide: QUEUE_OPTIONS,
          useValue: [opts],
        },
        QueueExplorerService,
      ],
      exports: [queueToken, QUEUE_OPTIONS],
    })
    class QueueRegisterModule {}

    return QueueRegisterModule
  }
}
