import { Token } from '@banhmi/common'
import type { OtelOptions } from './types'

/**
 * DI token for the {@link OtelOptions} registered via
 * {@link OtelModule.forRoot}.
 *
 * @example
 * class MyService {
 *   static inject = [OTEL_OPTIONS] as const
 *   constructor(private readonly opts: OtelOptions) {}
 * }
 */
export const OTEL_OPTIONS = Token<OtelOptions>('OTEL_OPTIONS')

/**
 * DI token for the OpenTelemetry tracer instance provided by
 * {@link OtelModule.forRoot}.
 *
 * The tracer is created from `@opentelemetry/api`'s global trace provider
 * after the `NodeSDK` starts. The token resolves to an `api.Tracer` object
 * that you can use to create custom spans.
 *
 * @example
 * import type { Tracer } from '@opentelemetry/api'
 *
 * class MyService {
 *   static inject = [OTEL_TRACER] as const
 *   constructor(private readonly tracer: Tracer) {}
 * }
 */
export const OTEL_TRACER = Token<unknown>('OTEL_TRACER')
