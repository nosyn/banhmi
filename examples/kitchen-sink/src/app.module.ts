import { CompressionModule } from '@banhmi/compression'
import { CookiesModule } from '@banhmi/cookies'
import { DevtoolsModule } from '@banhmi/devtools'
import { EventEmitterModule } from '@banhmi/events'
import { createChildLoggerProvider, LoggerModule } from '@banhmi/logger'
import type { MiddlewareConsumer } from '@banhmi/middleware'
import { QueueModule } from '@banhmi/queue'
import { RedisModule } from '@banhmi/redis'
import { ScheduleModule } from '@banhmi/scheduling'
import { SecurityModule } from '@banhmi/security'
import { SqliteModule } from '@banhmi/sqlite'
import { ThrottlerModule } from '@banhmi/throttler'
import { VersioningModule } from '@banhmi/versioning'
import { Module } from 'banhmi'
import { AttachmentsModule } from './attachments/attachments.module'
import { AuthModule } from './auth/auth.module'
import { config } from './config'
import { CleanupService } from './cron/cleanup.service'
import { EventsModule } from './events/events.module'
import { HealthModule } from './health/health.module'
import { EmailQueueModule } from './queue/email.queue.module'
import { TasksModule } from './tasks/tasks.module'

/**
 * Root application module.
 *
 * Wires every framework feature demonstrated in the kitchen-sink:
 * - HTTP versioning (URI prefix `v`)
 * - Signed cookies (session-id)
 * - gzip compression (threshold 1 KB)
 * - Security headers (Helmet + CORS; CSRF excluded — login flow conflicts)
 * - JWT authentication (@banhmi/auth + @banhmi/jwt)
 * - Throttling (global 5 req/min fallback; per-route overrides)
 * - SQLite :memory: (task storage)
 * - In-process events (EventEmitter)
 * - Scheduling (cron GC)
 * - Queue (email notifications via Redis or mock)
 * - SSE + WebSocket (EventsModule)
 * - Health check
 * - Devtools
 * - OpenAPI (wired in main.ts post-bootstrap)
 * - Logger
 * - Compression
 * - @banhmi/transform (serialize in controllers)
 * - @banhmi/cache (MemoryCacheStore in TasksService)
 */
@Module({
  imports: [
    LoggerModule.forRoot({ level: 'info' }),
    EventEmitterModule.forRoot(),
    VersioningModule.forRoot({ type: 'uri', prefix: 'v' }),
    CookiesModule.forRoot({ secret: config.cookieSecret }),
    CompressionModule.forRoot({ threshold: config.compressionThreshold }),
    SecurityModule.forRoot({
      helmet: {},
      cors: { origin: '*' },
      // CSRF is intentionally omitted: it conflicts with the simple
      // JSON login flow. In a real SPA, enable it for cookie-based routes.
    }),
    ThrottlerModule.forRoot({
      ttl: config.throttleTtlMs,
      limit: config.throttleLimit,
    }),
    SqliteModule.forRoot(':memory:'),
    RedisModule.forRoot(config.redisUrl),
    QueueModule.registerQueue({ name: 'emails' }),
    ScheduleModule.forRoot(),
    DevtoolsModule.forRoot({ enabled: true }),
    HealthModule,
    AuthModule,
    TasksModule,
    AttachmentsModule,
    EventsModule,
    EmailQueueModule,
  ],
  providers: [CleanupService, createChildLoggerProvider('CleanupService')],
})
export class AppModule {
  /**
   * Apply a simple access-log middleware to all routes.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        async (req: Request, _ctx: unknown, next: () => Promise<Response>) => {
          const url = new URL(req.url)
          console.log(`${req.method} ${url.pathname}`)
          return next()
        },
      )
      .forRoutes('')
  }
}
