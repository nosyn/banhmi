import type { OnApplicationBootstrap } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import { HEALTH_OPTIONS_TOKEN } from './tokens'
import type { HealthCheckResult, HealthOptions } from './types'

/**
 * Bootstrap service that mounts the health check endpoint via the HTTP adapter.
 *
 * Registers a pre-request middleware that intercepts `GET <path>` requests,
 * runs all configured indicators in parallel, and returns the aggregated result.
 *
 * @internal
 */
export class HealthController implements OnApplicationBootstrap {
  static inject = [HEALTH_OPTIONS_TOKEN, HTTP_ADAPTER_TOKEN] as const

  constructor(
    private readonly opts: HealthOptions,
    private readonly adapter: HttpAdapter,
  ) {}

  onApplicationBootstrap(): void {
    const path = this.opts.path ?? '/health'
    const indicators = this.opts.indicators ?? {}

    this.adapter.use(
      async (
        req: Request,
        next: () => Promise<Response>,
      ): Promise<Response> => {
        const url = new URL(req.url)
        if (req.method === 'GET' && url.pathname === path) {
          return this.runCheck(indicators)
        }
        return next()
      },
    )
  }

  /**
   * Run all indicators in parallel and return a {@link HealthCheckResult} response.
   *
   * @param indicators - Named indicator map to run.
   * @returns HTTP 200 if all up; 503 if any down.
   *
   * @internal
   */
  private async runCheck(
    indicators: NonNullable<HealthOptions['indicators']>,
  ): Promise<Response> {
    const entries = Object.entries(indicators)

    const results = await Promise.all(
      entries.map(async ([name, fn]) => {
        try {
          const result = await fn()
          return [name, result] as const
        } catch (err) {
          return [
            name,
            { status: 'down' as const, details: { error: String(err) } },
          ] as const
        }
      }),
    )

    const details: HealthCheckResult['details'] = {}
    let overallDown = false

    for (const [name, result] of results) {
      details[name] = { ...result.details, status: result.status }
      if (result.status === 'down') overallDown = true
    }

    const body: HealthCheckResult = {
      status: overallDown ? 'down' : 'up',
      details,
    }

    return Response.json(body, { status: overallDown ? 503 : 200 })
  }
}
