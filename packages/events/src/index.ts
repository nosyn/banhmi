/**
 * @banhmi/events — In-process pub/sub with wildcard pattern matching.
 *
 * Provides an {@link EventEmitter} class supporting synchronous (`emit`) and
 * asynchronous (`emitAsync`) dispatch, a method decorator `@OnEvent` for
 * declarative subscriptions, and {@link EventEmitterModule} for DI integration.
 *
 * @example
 * import { EventEmitterModule } from '@banhmi/events'
 *
 * \@Module({ imports: [EventEmitterModule.forRoot()] })
 * class AppModule {}
 */

export { OnEvent } from './decorators'
export { EventEmitter } from './event-emitter'
export { EventEmitterModule } from './event-emitter.module'
export { EventsExplorer } from './explorer'
export { ON_EVENT_METADATA } from './metadata'
export { EVENT_EMITTER_TOKEN } from './tokens'
export type { EventListener, OnEventOptions } from './types'
