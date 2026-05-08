import type { ClassConstructor, OnApplicationBootstrap } from '@banhmi/common'
import { CONTROLLER_METADATA, ROUTE_METADATA } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { HTTP_ADAPTER_TOKEN } from '@banhmi/platform-bun'
import type { MethodSkipThrottleMap, MethodThrottleMap } from './metadata'
import {
  METHOD_SKIP_THROTTLE_KEY,
  METHOD_THROTTLE_KEY,
  SKIP_THROTTLE_KEY,
  THROTTLE_METADATA_KEY,
} from './metadata'
import { MemoryThrottlerStorage } from './storage/memory'
import { THROTTLER_OPTIONS } from './tokens'
import type { ThrottleConfig, ThrottlerOptions } from './types'

/** Middleware function type used internally. */
type MiddlewareFn = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>

/**
 * Internal per-route throttle config derived from decorator metadata.
 * @internal
 */
type RouteThrottleEntry = {
  /** Normalised path pattern, e.g. `/cats/:id`. */
  path: string
  /** HTTP method (uppercase). */
  method: string
  /** Effective throttle config override, or `null` to use module default. */
  config: ThrottleConfig | null
  /** When `true`, throttling is bypassed entirely for this route. */
  skip: boolean
}

/**
 * Default key generator: first IP from `X-Forwarded-For` or `'unknown'`.
 * @internal
 */
function defaultKeyGenerator(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

/**
 * Convert a parameterised path like `/cats/:id` into a RegExp that matches
 * concrete paths like `/cats/123`.
 * @internal
 */
function pathToRegex(pattern: string): RegExp {
  const regexSource = pattern.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*')
  return new RegExp(`^${regexSource}$`)
}

/**
 * Token-bucket rate-limiter middleware.
 *
 * Installed at application bootstrap via `OnApplicationBootstrap`. Reads
 * `@Throttle` and `@SkipThrottle` metadata from registered controller classes
 * to apply per-route overrides. Handler-level metadata takes precedence over
 * controller-level; module defaults are the final fallback.
 *
 * Registered automatically by {@link ThrottlerModule.forRoot}.
 *
 * @example
 * ThrottlerModule.forRoot({ ttl: 60_000, limit: 100 })
 */
export class ThrottlerMiddleware implements OnApplicationBootstrap {
  static inject = [THROTTLER_OPTIONS, HTTP_ADAPTER_TOKEN] as const

  private readonly storage
  private readonly keyGenerator: (req: Request) => string
  private readonly defaultTtl: number
  private readonly defaultLimit: number
  private readonly routeEntries: RouteThrottleEntry[] = []

  constructor(
    readonly opts: ThrottlerOptions,
    private readonly adapter: HttpAdapter,
  ) {
    this.storage = opts.storage ?? new MemoryThrottlerStorage()
    this.keyGenerator = opts.keyGenerator ?? defaultKeyGenerator
    this.defaultTtl = opts.ttl
    this.defaultLimit = opts.limit

    // Patch the adapter's registerController at construction time so we
    // intercept every controller registration before onApplicationBootstrap.
    const original = this.adapter.registerController.bind(this.adapter)
    this.adapter.registerController = (
      instance: object,
      controllerClass: ClassConstructor,
    ) => {
      this.registerController(controllerClass)
      original(instance, controllerClass)
    }
  }

  /**
   * Register a controller class so its `@Throttle` and `@SkipThrottle`
   * metadata can be resolved at request time.
   *
   * @param controllerClass - The decorated controller class.
   *
   * @example
   * middleware.registerController(CatsController)
   */
  registerController(controllerClass: ClassConstructor): void {
    const meta = controllerClass[Symbol.metadata] as Record<
      symbol,
      unknown
    > | null
    if (!meta) return

    const ctrlMeta = meta[CONTROLLER_METADATA] as
      | { prefix?: string }
      | undefined
    if (!ctrlMeta) return

    const prefix = (ctrlMeta.prefix ?? '').replace(/\/$/, '')

    const classSkip = Boolean(meta[SKIP_THROTTLE_KEY])
    const classThrottle = meta[THROTTLE_METADATA_KEY] as
      | ThrottleConfig
      | undefined

    const methodThrottleMap =
      (meta[METHOD_THROTTLE_KEY] as MethodThrottleMap | undefined) ?? {}
    const methodSkipMap =
      (meta[METHOD_SKIP_THROTTLE_KEY] as MethodSkipThrottleMap | undefined) ??
      {}

    const routes = meta[ROUTE_METADATA] as
      | Record<string, { path?: string; method: string }>
      | undefined
    if (!routes) return

    for (const [handlerName, routeMeta] of Object.entries(routes)) {
      const routePath = routeMeta.path
        ? `${prefix}/${routeMeta.path.replace(/^\//, '')}`
        : prefix || '/'
      const normalizedPath = routePath.replace(/\/+/g, '/')

      // Handler-level overrides take precedence over controller-level
      const skip =
        methodSkipMap[handlerName] !== undefined
          ? methodSkipMap[handlerName]
          : classSkip
      const config =
        methodThrottleMap[handlerName] !== undefined
          ? (methodThrottleMap[handlerName] ?? null)
          : (classThrottle ?? null)

      this.routeEntries.push({
        path: normalizedPath,
        method: routeMeta.method.toUpperCase(),
        config,
        skip: skip ?? false,
      })
    }
  }

  /**
   * Called by the framework on bootstrap. Installs the rate-limiting
   * middleware on the adapter. Controller metadata is already collected by
   * the `registerController` patch applied in the constructor.
   */
  onApplicationBootstrap(): void {
    this.adapter.use(this.buildMiddleware())
  }

  /**
   * Build the raw middleware function. Exposed for unit testing without a full
   * application lifecycle.
   *
   * @returns A middleware function that enforces rate limiting.
   *
   * @example
   * const mw = middleware.buildMiddleware()
   * const res = await mw(new Request('http://localhost/'), next)
   */
  buildMiddleware(): MiddlewareFn {
    return async (req: Request, next: () => Promise<Response>) => {
      const url = new URL(req.url)
      const pathname = url.pathname

      // Resolve per-route entry (if any controller is registered)
      const entry = this.resolveEntry(req.method.toUpperCase(), pathname)

      if (entry?.skip) {
        return next()
      }

      const config = entry?.config ?? {
        ttl: this.defaultTtl,
        limit: this.defaultLimit,
      }

      const clientKey = this.keyGenerator(req)
      const storageKey = `${req.method.toUpperCase()}:${pathname}:${clientKey}`

      const { count, resetAt } = await this.storage.increment(
        storageKey,
        config.ttl,
      )

      const remaining = Math.max(0, config.limit - count)
      const resetSecs = Math.ceil((resetAt - Date.now()) / 1000)

      if (count > config.limit) {
        return new Response(
          JSON.stringify({
            message: 'Too Many Requests',
            statusCode: 429,
          }),
          {
            status: 429,
            headers: {
              'content-type': 'application/json',
              'X-RateLimit-Limit': String(config.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(resetAt),
              'Retry-After': String(resetSecs),
            },
          },
        )
      }

      const response = await next()
      const headers = new Headers(response.headers)
      headers.set('X-RateLimit-Limit', String(config.limit))
      headers.set('X-RateLimit-Remaining', String(remaining))
      headers.set('X-RateLimit-Reset', String(resetAt))

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
  }

  /**
   * Find the route entry matching the given method and pathname.
   * Returns `undefined` if no entry is registered (module defaults apply).
   * @internal
   */
  private resolveEntry(
    method: string,
    pathname: string,
  ): RouteThrottleEntry | undefined {
    for (const entry of this.routeEntries) {
      if (entry.method === method && pathToRegex(entry.path).test(pathname)) {
        return entry
      }
    }
    return undefined
  }
}
