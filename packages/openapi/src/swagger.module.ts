import type { ClassConstructor } from '@banhmi/common'
import type { BanhmiApplication, ModuleNode } from '@banhmi/core'
import { SwaggerExplorer } from './explorer'
import type { OpenApiDocument } from './types'
import { renderScalarHtml } from './ui/scalar'
import { renderSwaggerHtml } from './ui/swagger'

/**
 * Options for {@link SwaggerModule.setup}.
 */
export interface SwaggerModuleOptions {
  /**
   * Which UI renderer to use.
   *
   * - `'scalar'` (default) — renders the Scalar API Reference UI.
   * - `'swagger'` — renders the classic Swagger UI.
   *
   * @default 'scalar'
   */
  ui?: 'scalar' | 'swagger'
}

/**
 * Mounts an OpenAPI spec and interactive UI onto a running BanhmiApplication.
 *
 * Registers two middleware routes:
 *  - `GET <path>/openapi.json` — serves the OpenAPI document as JSON.
 *  - `GET <path>` — serves the chosen UI HTML (Scalar by default).
 *
 * @example
 * const doc = new DocumentBuilder().setTitle('My API').setVersion('1').build()
 * SwaggerModule.setup('/api', app, doc, { ui: 'scalar' })
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class SwaggerModule {
  /**
   * Wire up the OpenAPI spec and UI middleware.
   *
   * @param path - Base path prefix (e.g. `'/api'`).
   * @param app - The running BanhmiApplication instance.
   * @param document - OpenAPI document produced by {@link DocumentBuilder.build}.
   * @param opts - Optional renderer options.
   */
  static setup(
    path: string,
    app: BanhmiApplication,
    document: OpenApiDocument,
    opts?: SwaggerModuleOptions,
  ): void {
    const ui = opts?.ui ?? 'scalar'
    const normalizedPath = path.replace(/\/$/, '')
    const jsonPath = `${normalizedPath}/openapi.json`
    const uiPath = normalizedPath

    const explorer = new SwaggerExplorer()
    const controllers = SwaggerModule.collectControllers(app.moduleTree)
    explorer.explore(controllers, document)

    app.use(async (req: Request, next: () => Promise<Response>) => {
      const url = new URL(req.url)
      if (req.method === 'GET' && url.pathname === jsonPath) {
        return Response.json(document)
      }
      if (req.method === 'GET' && url.pathname === uiPath) {
        const html =
          ui === 'swagger'
            ? renderSwaggerHtml(jsonPath)
            : renderScalarHtml(jsonPath)
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
      return next()
    })
  }

  private static collectControllers(node: ModuleNode): ClassConstructor[] {
    const result: ClassConstructor[] = []
    const seen = new Set<ClassConstructor>()

    function walk(n: ModuleNode) {
      for (const imp of n.imports) walk(imp)
      for (const ctrl of n.controllers ?? []) {
        const c = ctrl as ClassConstructor
        if (!seen.has(c)) {
          seen.add(c)
          result.push(c)
        }
      }
    }

    walk(node)
    return result
  }
}
