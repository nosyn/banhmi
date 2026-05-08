import type { MethodSkipThrottleMap, MethodThrottleMap } from './metadata'
import {
  METHOD_SKIP_THROTTLE_KEY,
  METHOD_THROTTLE_KEY,
  SKIP_THROTTLE_KEY,
  THROTTLE_METADATA_KEY,
} from './metadata'
import type { ThrottleConfig } from './types'

/**
 * Override the module-default rate-limit for the decorated handler or
 * controller class.
 *
 * Applied metadata is read by the throttler middleware at request time.
 * Handler-level `@Throttle` takes precedence over controller-level `@Throttle`,
 * which in turn takes precedence over the module default.
 *
 * @param config - Rate-limit override. `ttl` is in milliseconds.
 *
 * @example
 * \@Controller()
 * class ApiController {
 *   \@Get('/slow')
 *   \@Throttle({ ttl: 60_000, limit: 5 })
 *   slow() { return 'ok' }
 * }
 */
export function Throttle(config: ThrottleConfig) {
  return (
    _target: unknown,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): void => {
    if (context.kind === 'class') {
      context.metadata[THROTTLE_METADATA_KEY] = config
    } else {
      const methodName = context.name as string
      const existing =
        (context.metadata[METHOD_THROTTLE_KEY] as
          | MethodThrottleMap
          | undefined) ?? {}
      context.metadata[METHOD_THROTTLE_KEY] = {
        ...existing,
        [methodName]: config,
      }
    }
  }
}

/**
 * Exempt the decorated handler or controller from rate limiting entirely.
 *
 * When applied to a class, all handlers in that controller are exempted.
 * When applied to a method, only that handler is exempted.
 *
 * @example
 * \@Controller()
 * class HealthController {
 *   \@Get('/health')
 *   \@SkipThrottle()
 *   health() { return { ok: true } }
 * }
 */
export function SkipThrottle() {
  return (
    _target: unknown,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): void => {
    if (context.kind === 'class') {
      context.metadata[SKIP_THROTTLE_KEY] = true
    } else {
      const methodName = context.name as string
      const existing =
        (context.metadata[METHOD_SKIP_THROTTLE_KEY] as
          | MethodSkipThrottleMap
          | undefined) ?? {}
      context.metadata[METHOD_SKIP_THROTTLE_KEY] = {
        ...existing,
        [methodName]: true,
      }
    }
  }
}
