/**
 * Options passed to {@link OtelModule.forRoot}.
 *
 * @example
 * OtelModule.forRoot({
 *   serviceName: 'my-api',
 *   exporters: ['otlp'],
 *   enabled: true,
 * })
 */
export type OtelOptions = {
  /** OTEL `service.name` resource attribute. Required. */
  serviceName: string
  /**
   * Which exporters to configure.
   * - `'console'` — logs spans to stdout (useful in development).
   * - `'otlp'` — exports via OTLP HTTP to `OTEL_EXPORTER_OTLP_ENDPOINT`
   *   (or `http://localhost:4318` by default).
   *
   * @defaultValue `['console']`
   */
  exporters?: Array<'otlp' | 'console'>
  /**
   * Additional OTel resource attributes merged into the service resource.
   *
   * @example
   * { 'deployment.environment': 'production', 'service.version': '1.2.3' }
   */
  resource?: Record<string, unknown>
  /**
   * Set to `false` to skip SDK initialisation (useful in tests).
   *
   * @defaultValue true
   */
  enabled?: boolean
}
