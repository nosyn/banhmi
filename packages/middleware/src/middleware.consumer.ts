import type {
  MiddlewareConsumer,
  MiddlewareFn,
  MiddlewareFnOrClass,
  MiddlewareRoute,
} from './middleware.types'

/**
 * A collected middleware binding: a resolved functional middleware and the
 * route pattern(s) it should apply to.
 */
export interface MiddlewareBinding {
  /** Resolved functional middleware. */
  fn: MiddlewareFn
  /** Normalised route string (e.g. `'cats'`). */
  path: string
  /** HTTP method filter, or `'ALL'` to match all methods. */
  method: string
}

/**
 * Concrete implementation of {@link MiddlewareConsumer}.
 *
 * Accumulates middleware bindings during the `configure()` call on a module
 * class. Bindings can be retrieved via {@link BunMiddlewareConsumer.bindings}
 * after `configure()` completes.
 *
 * This class is instantiated internally by the framework and should not be
 * used directly by application code.
 *
 * @example
 * const consumer = new BunMiddlewareConsumer()
 * appModuleInstance.configure(consumer)
 * const bindings = consumer.bindings
 */
export class BunMiddlewareConsumer implements MiddlewareConsumer {
  private readonly _bindings: MiddlewareBinding[] = []

  /** All collected middleware bindings after `configure()` has run. */
  get bindings(): readonly MiddlewareBinding[] {
    return this._bindings
  }

  apply(...mws: MiddlewareFnOrClass[]): {
    forRoutes(...routes: MiddlewareRoute[]): MiddlewareConsumer
  } {
    const resolvedFns = mws.map(resolveFn)
    const self = this

    return {
      forRoutes(...routes: MiddlewareRoute[]): MiddlewareConsumer {
        for (const route of routes) {
          const { path, method } = normalizeRoute(route)
          for (const fn of resolvedFns) {
            self._bindings.push({ fn, path, method })
          }
        }
        return self
      },
    }
  }
}

/**
 * Converts a `MiddlewareFnOrClass` to a `MiddlewareFn`.
 * Class constructors are instantiated and their `use` method is bound.
 */
function resolveFn(mw: MiddlewareFnOrClass): MiddlewareFn {
  if (typeof mw === 'function' && mw.prototype === undefined) {
    // Arrow function or plain function
    return mw as MiddlewareFn
  }

  // Check if it's a class constructor (has prototype with 'use' method)
  const proto = (mw as { prototype?: { use?: MiddlewareFn } }).prototype
  if (proto && typeof proto.use === 'function') {
    const instance = new (mw as new () => { use: MiddlewareFn })()
    return instance.use.bind(instance)
  }

  // Fallback: treat as a plain function
  return mw as MiddlewareFn
}

/**
 * Normalises a `MiddlewareRoute` into a `{ path, method }` pair.
 * Strips leading/trailing slashes from path for consistent matching.
 */
function normalizeRoute(route: MiddlewareRoute): {
  path: string
  method: string
} {
  if (typeof route === 'string') {
    return { path: route.replace(/^\/|\/$/g, ''), method: 'ALL' }
  }
  return {
    path: route.path.replace(/^\/|\/$/g, ''),
    method: route.method ?? 'ALL',
  }
}
