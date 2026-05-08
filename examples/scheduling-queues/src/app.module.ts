import { DevtoolsModule } from '@banhmi/devtools'
import { EventEmitterModule } from '@banhmi/events'
import { createChildLoggerProvider, LoggerModule } from '@banhmi/logger'
import { QueueModule } from '@banhmi/queue'
import { RedisModule } from '@banhmi/redis'
import { ScheduleModule } from '@banhmi/scheduling'
import { Module } from 'banhmi'
import { HeartbeatService } from './cron/heartbeat.service'
import { EmailModule } from './email/email.module'

/**
 * Root application module for the scheduling-queues cluster example.
 *
 * Demonstrates logger, events, scheduling, queue, and devtools together.
 */
@Module({
  imports: [
    LoggerModule.forRoot({ level: 'info' }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    RedisModule.forRoot(Bun.env.REDIS_URL ?? 'redis://localhost:6379'),
    QueueModule.registerQueue({ name: 'emails' }),
    DevtoolsModule.forRoot({ enabled: true }),
    EmailModule,
  ],
  providers: [
    HeartbeatService,
    // Child logger token for HeartbeatService
    createChildLoggerProvider('HeartbeatService'),
  ],
})
export class AppModule {}
