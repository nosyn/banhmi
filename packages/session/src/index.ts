/**
 * @banhmi/session — Server-side sessions with memory and Redis stores.
 *
 * Use the `@Session(opts)` method decorator to enable sessions on a handler.
 * Call {@link getSession} inside the handler to read and write session data.
 * Register defaults via `SessionModule.forRoot()`.
 *
 * Import the Redis store from the subpath `@banhmi/session/redis` to avoid
 * pulling in the ioredis peer dependency unless needed.
 *
 * @example
 * import { SessionModule, Session, getSession } from '@banhmi/session'
 *
 * \@Controller()
 * class CounterController {
 *   \@Get('/')
 *   \@Session({ secret: 'my-secret' })
 *   async index(ctx: RouteCtx) {
 *     const s = getSession(ctx)
 *     const n = (s.get<number>('count') ?? 0) + 1
 *     s.set('count', n)
 *     return { count: n }
 *   }
 * }
 *
 * \@Module({
 *   imports: [SessionModule.forRoot({ secret: 'my-secret' })],
 *   controllers: [CounterController],
 * })
 * class AppModule {}
 */

export { Session } from './session.decorator'
export { getSession } from './session.middleware'
export { SessionModule } from './session.module'
export { MemorySessionStore } from './stores/memory'
export { SESSION_OPTIONS } from './tokens'
export type {
  SessionData,
  SessionOptions,
  SessionRef,
  SessionStore,
} from './types'
