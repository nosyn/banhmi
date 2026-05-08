import type { RouteCtx } from '@banhmi/common'
import { getActiveEngine } from './registry'

type Handler = (ctx: RouteCtx, ...args: unknown[]) => unknown

/** @internal State key stored on ctx so the @Render decorator can read the engine. */
export const RENDER_ENGINE_STATE_KEY = 'banhmi:mvc:engine'

/**
 * Method decorator that renders a named template using the configured view
 * engine. The decorated handler's return value is used as the template locals.
 *
 * The response `Content-Type` is set to `text/html; charset=utf-8`.
 *
 * The view engine must be registered via `MvcModule.forRoot()` before the
 * application starts.
 *
 * @param template - Template name to render (without extension).
 *
 * @example
 * import { Controller, Get } from 'banhmi'
 * import { Render } from '@banhmi/mvc'
 *
 * \@Controller()
 * class HomeController {
 *   \@Get('/')
 *   \@Render('home')
 *   index() {
 *     return { title: 'Welcome' }
 *   }
 * }
 */
export function Render(template: string) {
  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      // Try ctx.state first (test-injected engine), then fall back to registry
      const engine =
        (ctx.state[RENDER_ENGINE_STATE_KEY] as
          | import('./types').ViewEngine
          | undefined) ?? getActiveEngine()

      if (!engine) {
        throw new Error(
          `@Render('${template}'): no view engine found. Did you import MvcModule.forRoot()?`,
        )
      }

      const locals = await original.call(this, ctx, ...rest)
      const html = await engine.render(
        template,
        (locals ?? {}) as Record<string, unknown>,
      )
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }
}
