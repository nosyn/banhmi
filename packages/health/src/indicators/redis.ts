import type { HealthIndicator } from '../types'

/**
 * A minimal Redis client interface that supports the `PING` command.
 *
 * Compatible with `@banhmi/redis` and similar clients.
 *
 * @example
 * const client = new Redis({ host: 'localhost' })
 * redisIndicator(client)
 */
export type RedisPingClient = {
  /**
   * Send a PING command and return the response.
   * Returns `'PONG'` or a custom message.
   */
  ping(): Promise<string>
}

/**
 * Built-in health indicator that checks a Redis connection by sending a
 * `PING` command.
 *
 * @param client - A Redis client with a `ping()` method.
 * @returns A {@link HealthIndicator} function.
 *
 * @example
 * HealthModule.forRoot({
 *   indicators: {
 *     redis: redisIndicator(redisClient),
 *   },
 * })
 */
export function redisIndicator(client: RedisPingClient): HealthIndicator {
  return async () => {
    try {
      await client.ping()
      return { status: 'up' }
    } catch (err) {
      return {
        status: 'down',
        details: { error: String(err) },
      }
    }
  }
}
