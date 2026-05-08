import { QueueModule } from '@banhmi/queue'
import { RedisModule } from '@banhmi/redis'
import { Module } from 'banhmi'
import { EmailProcessor } from './email.processor'

/**
 * Demo module showing `@banhmi/queue` with a simulated email queue.
 *
 * To run: set `REDIS_URL` and start with `bun run src/main.ts`.
 */
@Module({
  imports: [
    RedisModule.forRoot(Bun.env.REDIS_URL ?? 'redis://localhost:6379'),
    QueueModule.registerQueue({ name: 'emails' }),
  ],
  providers: [EmailProcessor],
})
export class AppModule {}
