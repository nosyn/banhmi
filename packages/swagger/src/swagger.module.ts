import type { ClassConstructor } from '@banhmi/common'
import type { BanhmiApplication, ModuleNode } from '@banhmi/core'
import { SwaggerExplorer } from './explorer'
import type { OpenApiDocument } from './types'

export class SwaggerModule {
  static setup(
    path: string,
    app: BanhmiApplication,
    document: OpenApiDocument,
  ): void {
    const normalizedPath = path.replace(/\/$/, '')
    const jsonPath = `${normalizedPath}-json`
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
        return new Response(SwaggerModule.renderUi(jsonPath), {
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

  private static renderUi(jsonPath: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({ url: '${jsonPath}', dom_id: '#swagger-ui' })
</script>
</body>
</html>`
  }
}
