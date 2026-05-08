/**
 * @banhmi/otel — OpenTelemetry SDK bridge for Banhmi.
 *
 * Provides a {@link OtelModule} that initialises `@opentelemetry/sdk-node` at
 * application bootstrap and an {@link OtelInterceptor} that wraps every
 * request handler in an OTel span carrying standard HTTP semantic-convention
 * attributes.
 *
 * Requires `@opentelemetry/sdk-node` and `@opentelemetry/api` v1 as peer
 * dependencies.
 *
 * @example
 * import { Module } from 'banhmi'
 * import { OtelModule } from '@banhmi/otel'
 *
 * \@Module({
 *   imports: [
 *     OtelModule.forRoot({
 *       serviceName: 'my-api',
 *       exporters: ['otlp'],
 *     }),
 *   ],
 * })
 * class AppModule {}
 */

export { OtelInterceptor } from './otel.interceptor'
export { OtelModule } from './otel.module'
export { OTEL_OPTIONS, OTEL_TRACER } from './tokens'
export type { OtelOptions } from './types'
