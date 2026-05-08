import type { OnApplicationBootstrap } from '@banhmi/common'
import { Module } from '@banhmi/common'
import { OTEL_OPTIONS, OTEL_TRACER } from './tokens'
import type { OtelOptions } from './types'

/**
 * Internal bootstrap service that starts the OTel NodeSDK and exposes the
 * tracer when the application initialises.
 *
 * @internal
 */
class OtelBootstrapService implements OnApplicationBootstrap {
  static inject = [OTEL_OPTIONS] as const

  private sdk: unknown = null

  constructor(private readonly opts: OtelOptions) {}

  onApplicationBootstrap(): void {
    if (this.opts.enabled === false) return

    try {
      const { NodeSDK } = require('@opentelemetry/sdk-node')
      const sdkConfig: Record<string, unknown> = {}

      const exporters = this.opts.exporters ?? ['console']

      if (exporters.includes('console')) {
        const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node')
        sdkConfig.traceExporter = new ConsoleSpanExporter()
      } else if (exporters.includes('otlp')) {
        const {
          OTLPTraceExporter,
        } = require('@opentelemetry/exporter-trace-otlp-http')
        sdkConfig.traceExporter = new OTLPTraceExporter()
      }

      if (this.opts.resource) {
        const { Resource } = require('@opentelemetry/resources')
        const {
          SEMRESATTRS_SERVICE_NAME,
        } = require('@opentelemetry/semantic-conventions')
        sdkConfig.resource = new Resource({
          [SEMRESATTRS_SERVICE_NAME]: this.opts.serviceName,
          ...this.opts.resource,
        })
      } else {
        const { Resource } = require('@opentelemetry/resources')
        const {
          SEMRESATTRS_SERVICE_NAME,
        } = require('@opentelemetry/semantic-conventions')
        sdkConfig.resource = new Resource({
          [SEMRESATTRS_SERVICE_NAME]: this.opts.serviceName,
        })
      }

      this.sdk = new NodeSDK(sdkConfig)
      ;(this.sdk as { start(): void }).start()
    } catch {
      // peer deps not installed — skip SDK init
    }
  }
}

/**
 * Module that initialises the OpenTelemetry `NodeSDK` at application
 * bootstrap and provides the {@link OTEL_TRACER} and {@link OTEL_OPTIONS}
 * tokens.
 *
 * Requires `@opentelemetry/sdk-node` and `@opentelemetry/api` as peer
 * dependencies.
 *
 * When `enabled: false` is passed the SDK is **not** initialised, which is
 * useful in test environments.
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
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class OtelModule {
  /**
   * Create a configured OTel module.
   *
   * @param opts - {@link OtelOptions} — `serviceName` is required.
   *
   * @example
   * OtelModule.forRoot({ serviceName: 'demo', exporters: ['console'] })
   */
  static forRoot(opts: OtelOptions) {
    @Module({
      providers: [
        { provide: OTEL_OPTIONS, useValue: opts },
        {
          provide: OTEL_TRACER,
          useFactory: () => {
            try {
              const api = require('@opentelemetry/api')
              return api.trace.getTracer(opts.serviceName)
            } catch {
              // @opentelemetry/api not installed — return a no-op tracer shim
              return {
                startSpan: (_name: string) => ({
                  setAttribute: () => ({
                    setAttribute: () => ({ end: () => {} }),
                  }),
                  setStatus: () => ({ setStatus: () => {}, end: () => {} }),
                  end: () => {},
                }),
              }
            }
          },
        },
        OtelBootstrapService,
      ],
      exports: [OTEL_OPTIONS, OTEL_TRACER],
    })
    class OtelRootModule {}

    return OtelRootModule
  }
}
