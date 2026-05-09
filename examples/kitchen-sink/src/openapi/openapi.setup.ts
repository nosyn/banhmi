import type { BanhmiApplication } from '@banhmi/core'
import { DocumentBuilder, SwaggerModule } from '@banhmi/openapi'

/**
 * Register the OpenAPI (Scalar UI) documentation endpoint.
 *
 * After calling this helper, two routes are available:
 * - `GET /api/docs`            — Scalar interactive UI
 * - `GET /api/docs/openapi.json` — Raw OpenAPI JSON spec
 *
 * @param app - The bootstrapped {@link BanhmiApplication}.
 */
export function setupOpenApi(app: BanhmiApplication): void {
  const doc = new DocumentBuilder()
    .setTitle('Kitchen Sink API')
    .setVersion('1.0.0')
    .setDescription(
      'End-to-end Banhmi demo: HTTP, validation, auth, queues, scheduling, ' +
        'events, SSE, WebSocket, OpenAPI, devtools, and more.',
    )
    .build()

  SwaggerModule.setup('/api/docs', app, doc)
}
