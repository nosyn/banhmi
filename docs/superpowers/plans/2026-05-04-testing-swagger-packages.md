# @banhmi/testing + @banhmi/swagger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@banhmi/testing` (test helpers for spinning up module under test, resolving providers, mocking) and `@banhmi/swagger` (OpenAPI spec generation from controller/route metadata, served as JSON endpoint + Swagger UI).

**Architecture:** `@banhmi/testing` exposes `BanhmiTestingModule.createTestingModule({ imports, providers })` that builds the DI container without starting an HTTP server. It resolves providers and can override them with mocks. `@banhmi/swagger` reads `Symbol.metadata` from controllers to build an OpenAPI 3.1 document; `SwaggerModule.setup(path, app, document)` registers a GET route for the spec JSON and a UI HTML page. The `DocumentBuilder` fluent API constructs the document skeleton.

**Tech Stack:** `@banhmi/core` Container, `Symbol.metadata`, OpenAPI 3.1 JSON, Bun test runner, Swagger UI CDN embed

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/testing/package.json` | Package manifest — `@banhmi/testing` |
| `packages/testing/tsconfig.json` | Extends root tsconfig |
| `packages/testing/bunfig.toml` | Preloads Symbol.metadata polyfill |
| `packages/testing/src/testing-module.ts` | `BanhmiTestingModule.createTestingModule()` |
| `packages/testing/src/index.ts` | Re-exports |
| `packages/testing/test/testing-module.test.ts` | Tests for the test helper itself |
| `packages/swagger/package.json` | Package manifest — `@banhmi/swagger` |
| `packages/swagger/tsconfig.json` | Extends root tsconfig |
| `packages/swagger/bunfig.toml` | Preloads Symbol.metadata polyfill |
| `packages/swagger/src/document-builder.ts` | `DocumentBuilder` fluent API |
| `packages/swagger/src/explorer.ts` | `SwaggerExplorer` — reads metadata to build OpenAPI paths |
| `packages/swagger/src/swagger.module.ts` | `SwaggerModule.setup(path, app, document)` |
| `packages/swagger/src/types.ts` | OpenAPI 3.1 TypeScript types |
| `packages/swagger/src/index.ts` | Re-exports |
| `packages/swagger/test/swagger.test.ts` | Unit tests |
| `packages/banhmi/src/index.ts` | Add exports |
| `packages/banhmi/package.json` | Add workspace deps |

---

### Task 1: @banhmi/testing scaffold + BanhmiTestingModule

**Files:**
- Create: `packages/testing/package.json`
- Create: `packages/testing/tsconfig.json`
- Create: `packages/testing/bunfig.toml`
- Create: `packages/testing/src/testing-module.ts`
- Create: `packages/testing/src/index.ts`
- Create: `packages/testing/test/testing-module.test.ts`

- [ ] **Step 1: Create `packages/testing/package.json`**

```json
{
  "name": "@banhmi/testing",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*",
    "@banhmi/core": "workspace:*",
    "@banhmi/platform-bun": "workspace:*"
  }
}
```

- [ ] **Step 2: Create `packages/testing/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `packages/testing/bunfig.toml`**

```toml
[test]
preload = ["../common/src/polyfill-symbol-metadata.ts"]
```

- [ ] **Step 4: Write the failing tests**

Create `packages/testing/test/testing-module.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { Injectable, Module } from '@banhmi/common'
import { Token } from '@banhmi/common'
import { BanhmiTestingModule } from '../src/testing-module'

const GREETER = Token<{ greet: () => string }>('Greeter')

describe('BanhmiTestingModule', () => {
  test('resolves a provider by class', async () => {
    @Injectable()
    class GreeterService {
      greet() { return 'hello' }
    }

    @Module({ providers: [GreeterService] })
    class AppModule {}

    const module = await BanhmiTestingModule.createTestingModule({ imports: [AppModule] })
    const svc = module.get(GreeterService)
    expect(svc.greet()).toBe('hello')
    await module.close()
  })

  test('resolves a provider by token', async () => {
    @Module({
      providers: [{ provide: GREETER, useValue: { greet: () => 'hi' } }],
      exports: [GREETER],
    })
    class AppModule {}

    const module = await BanhmiTestingModule.createTestingModule({ imports: [AppModule] })
    const svc = module.get(GREETER)
    expect(svc.greet()).toBe('hi')
    await module.close()
  })

  test('overrides a provider with a mock', async () => {
    @Injectable()
    class EmailService {
      send() { return 'real email sent' }
    }

    @Module({ providers: [EmailService] })
    class AppModule {}

    const mockEmail = { send: () => 'mock email sent' }
    const module = await BanhmiTestingModule.createTestingModule({
      imports: [AppModule],
      overrides: [{ token: EmailService, useValue: mockEmail }],
    })

    const svc = module.get(EmailService)
    expect(svc.send()).toBe('mock email sent')
    await module.close()
  })
})
```

- [ ] **Step 5: Run to confirm failure**

```bash
cd packages/testing && bun test test/testing-module.test.ts
```
Expected: FAIL — `BanhmiTestingModule` not found.

- [ ] **Step 6: Create `packages/testing/src/testing-module.ts`**

```ts
import type { ClassConstructor, ModuleMetadata, ProviderDef } from '@banhmi/common'
import { Module } from '@banhmi/common'
import { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'

export interface TestingModuleOptions {
  imports?: ClassConstructor[]
  providers?: ProviderDef[]
  overrides?: Array<{ token: ClassConstructor | symbol; useValue: unknown }>
}

export class TestingModuleRef {
  constructor(private readonly app: BanhmiApplication) {}

  get<T>(token: ClassConstructor<T> | symbol): T {
    return this.app.container.resolve(token as ClassConstructor<T>) as T
  }

  async close(): Promise<void> {
    await this.app.close()
  }
}

export class BanhmiTestingModule {
  static async createTestingModule(options: TestingModuleOptions): Promise<TestingModuleRef> {
    const providers: ProviderDef[] = [...(options.providers ?? [])]

    for (const override of options.overrides ?? []) {
      providers.push({ provide: override.token as symbol, useValue: override.useValue })
    }

    @Module({
      imports: options.imports ?? [],
      providers,
    })
    class TestModule {}

    const app = await BanhmiFactory.create(TestModule)
    return new TestingModuleRef(app)
  }
}
```

- [ ] **Step 7: Create `packages/testing/src/index.ts`**

```ts
export { BanhmiTestingModule, TestingModuleRef } from './testing-module'
export type { TestingModuleOptions } from './testing-module'
```

- [ ] **Step 8: Run tests to confirm pass**

```bash
cd packages/testing && bun test test/testing-module.test.ts
```
Expected: 3 tests passing.

- [ ] **Step 9: Commit**

```bash
git add packages/testing/
git commit -m "feat(testing): add BanhmiTestingModule with provider resolution and mock overrides"
```

---

### Task 2: @banhmi/swagger scaffold + DocumentBuilder

**Files:**
- Create: `packages/swagger/package.json`
- Create: `packages/swagger/tsconfig.json`
- Create: `packages/swagger/bunfig.toml`
- Create: `packages/swagger/src/types.ts`
- Create: `packages/swagger/src/document-builder.ts`
- Create: `packages/swagger/test/swagger.test.ts`

- [ ] **Step 1: Create `packages/swagger/package.json`**

```json
{
  "name": "@banhmi/swagger",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*",
    "@banhmi/core": "workspace:*",
    "@banhmi/platform-bun": "workspace:*"
  }
}
```

- [ ] **Step 2: Create `packages/swagger/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `packages/swagger/bunfig.toml`**

```toml
[test]
preload = ["../common/src/polyfill-symbol-metadata.ts"]
```

- [ ] **Step 4: Write the failing tests for DocumentBuilder**

Create `packages/swagger/test/swagger.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { DocumentBuilder } from '../src/document-builder'

describe('DocumentBuilder', () => {
  test('builds a minimal OpenAPI document', () => {
    const doc = new DocumentBuilder()
      .setTitle('Test API')
      .setVersion('1.0.0')
      .build()

    expect(doc.openapi).toBe('3.1.0')
    expect(doc.info.title).toBe('Test API')
    expect(doc.info.version).toBe('1.0.0')
    expect(doc.paths).toEqual({})
  })

  test('adds servers', () => {
    const doc = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1')
      .addServer('https://api.example.com', 'Production')
      .build()

    expect(doc.servers?.[0]?.url).toBe('https://api.example.com')
    expect(doc.servers?.[0]?.description).toBe('Production')
  })

  test('adds bearerAuth security scheme', () => {
    const doc = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1')
      .addBearerAuth()
      .build()

    expect(
      doc.components?.securitySchemes?.['bearerAuth'],
    ).toEqual({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
  })
})
```

- [ ] **Step 5: Run to confirm failure**

```bash
cd packages/swagger && bun test test/swagger.test.ts
```
Expected: FAIL — `DocumentBuilder` not found.

- [ ] **Step 6: Create `packages/swagger/src/types.ts`**

```ts
export interface OpenApiInfo {
  title: string
  version: string
  description?: string
}

export interface OpenApiServer {
  url: string
  description?: string
}

export interface OpenApiSecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect'
  scheme?: string
  bearerFormat?: string
  name?: string
  in?: string
}

export interface OpenApiComponents {
  securitySchemes?: Record<string, OpenApiSecurityScheme>
  schemas?: Record<string, unknown>
}

export interface OpenApiDocument {
  openapi: '3.1.0'
  info: OpenApiInfo
  servers?: OpenApiServer[]
  paths: Record<string, unknown>
  components?: OpenApiComponents
}
```

- [ ] **Step 7: Create `packages/swagger/src/document-builder.ts`**

```ts
import type { OpenApiDocument, OpenApiSecurityScheme } from './types'

export class DocumentBuilder {
  private title = ''
  private version = ''
  private description?: string
  private servers: Array<{ url: string; description?: string }> = []
  private securitySchemes: Record<string, OpenApiSecurityScheme> = {}

  setTitle(title: string): this {
    this.title = title
    return this
  }

  setVersion(version: string): this {
    this.version = version
    return this
  }

  setDescription(description: string): this {
    this.description = description
    return this
  }

  addServer(url: string, description?: string): this {
    this.servers.push({ url, description })
    return this
  }

  addBearerAuth(name = 'bearerAuth'): this {
    this.securitySchemes[name] = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    }
    return this
  }

  addApiKey(name = 'apiKey', headerName = 'X-API-Key'): this {
    this.securitySchemes[name] = {
      type: 'apiKey',
      name: headerName,
      in: 'header',
    }
    return this
  }

  build(): OpenApiDocument {
    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: {
        title: this.title,
        version: this.version,
        ...(this.description ? { description: this.description } : {}),
      },
      paths: {},
    }

    if (this.servers.length > 0) doc.servers = this.servers
    if (Object.keys(this.securitySchemes).length > 0) {
      doc.components = { securitySchemes: this.securitySchemes }
    }

    return doc
  }
}
```

- [ ] **Step 8: Run tests to confirm pass**

```bash
cd packages/swagger && bun test test/swagger.test.ts
```
Expected: 3 tests passing.

- [ ] **Step 9: Commit**

```bash
git add packages/swagger/src/types.ts packages/swagger/src/document-builder.ts packages/swagger/test/swagger.test.ts packages/swagger/package.json packages/swagger/tsconfig.json packages/swagger/bunfig.toml
git commit -m "feat(swagger): add DocumentBuilder for OpenAPI 3.1 document construction"
```

---

### Task 3: SwaggerExplorer — read route metadata

**Files:**
- Create: `packages/swagger/src/explorer.ts`

- [ ] **Step 1: Write the failing tests** (add to `packages/swagger/test/swagger.test.ts`)

```ts
import { Controller, Get, Post } from '@banhmi/common'
import { SwaggerExplorer } from '../src/explorer'
import type { OpenApiDocument } from '../src/types'

describe('SwaggerExplorer', () => {
  test('adds paths from a controller', () => {
    @Controller('/cats')
    class CatsController {
      @Get('/')
      findAll() {}

      @Post('/')
      create() {}

      @Get('/:id')
      findOne() {}
    }

    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
    }

    const explorer = new SwaggerExplorer()
    explorer.explore([CatsController], doc)

    expect(doc.paths['/cats']).toBeDefined()
    expect((doc.paths['/cats'] as Record<string, unknown>)['get']).toBeDefined()
    expect((doc.paths['/cats'] as Record<string, unknown>)['post']).toBeDefined()
    expect(doc.paths['/cats/{id}']).toBeDefined()
    expect((doc.paths['/cats/{id}'] as Record<string, unknown>)['get']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/swagger && bun test test/swagger.test.ts
```
Expected: FAIL — `SwaggerExplorer` not found.

- [ ] **Step 3: Create `packages/swagger/src/explorer.ts`**

```ts
import type { ClassConstructor, RouteDefinitionMeta } from '@banhmi/common'
import {
  CONTROLLER_METADATA,
  ROUTE_METADATA,
} from '@banhmi/common'
import type { OpenApiDocument } from './types'

export class SwaggerExplorer {
  explore(controllers: ClassConstructor[], doc: OpenApiDocument): void {
    for (const controller of controllers) {
      const classMeta = controller[Symbol.metadata] as Record<symbol, unknown> | null
      if (!classMeta) continue

      const controllerMeta = classMeta[CONTROLLER_METADATA] as { prefix: string } | undefined
      if (!controllerMeta) continue

      const prefix = controllerMeta.prefix.replace(/\/$/, '')
      const routes = classMeta[ROUTE_METADATA] as Record<string, RouteDefinitionMeta> | undefined
      if (!routes) continue

      for (const [_methodName, routeMeta] of Object.entries(routes)) {
        const routePath = routeMeta.path
          ? `${prefix}/${routeMeta.path.replace(/^\//, '')}`
          : prefix || '/'

        // Convert :param to {param} for OpenAPI
        const openApiPath = routePath
          .replace(/\/+/g, '/')
          .replace(/:([^/]+)/g, '{$1}')

        if (!doc.paths[openApiPath]) {
          doc.paths[openApiPath] = {}
        }

        const httpMethod = routeMeta.method.toLowerCase()
        const pathItem = doc.paths[openApiPath] as Record<string, unknown>
        pathItem[httpMethod] = {
          responses: {
            '200': { description: 'Success' },
          },
        }
      }
    }
  }
}
```

Note: `RouteDefinitionMeta` must be exported from `@banhmi/common`. Check if it is:
```bash
grep -r "RouteDefinitionMeta" packages/common/src/index.ts
```
If missing, add the export to `packages/common/src/index.ts`.

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd packages/swagger && bun test test/swagger.test.ts
```
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add packages/swagger/src/explorer.ts packages/swagger/test/swagger.test.ts
git commit -m "feat(swagger): add SwaggerExplorer that reads controller route metadata"
```

---

### Task 4: SwaggerModule.setup + index

**Files:**
- Create: `packages/swagger/src/swagger.module.ts`
- Create: `packages/swagger/src/index.ts`

- [ ] **Step 1: Write the failing integration test** (add to `packages/swagger/test/swagger.test.ts`)

```ts
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { SwaggerModule } from '../src/swagger.module'

describe('SwaggerModule.setup (integration)', () => {
  test('serves OpenAPI JSON at /api-json', async () => {
    @Controller('/items')
    class ItemsController {
      @Get('/')
      findAll() { return [] }
    }

    @Module({ controllers: [ItemsController] })
    class AppModule {}

    const app = await BanhmiFactory.create(AppModule)
    const doc = new DocumentBuilder().setTitle('Items API').setVersion('1').build()

    SwaggerModule.setup('/api', app, doc)

    await app.listen(0)
    const port = (app.adapter as { server?: { port: number } }).server?.port ?? 4000

    const res = await fetch(`http://localhost:${port}/api-json`)
    expect(res.status).toBe(200)
    const body = await res.json() as OpenApiDocument
    expect(body.info.title).toBe('Items API')

    await app.close()
  })
})
```

- [ ] **Step 2: Create `packages/swagger/src/swagger.module.ts`**

```ts
import type { ClassConstructor } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import type { OpenApiDocument } from './types'
import { SwaggerExplorer } from './explorer'

export class SwaggerModule {
  static setup(
    path: string,
    app: BanhmiApplication,
    document: OpenApiDocument,
  ): void {
    const normalizedPath = path.replace(/\/$/, '')
    const explorer = new SwaggerExplorer()

    // Collect all controllers from the module tree
    const controllers = SwaggerModule.collectControllers(app)
    explorer.explore(controllers, document)

    const jsonPath = `${normalizedPath}-json`
    const uiPath = normalizedPath

    // Register JSON spec route
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

  private static collectControllers(app: BanhmiApplication): ClassConstructor[] {
    const result: ClassConstructor[] = []
    const seen = new Set<ClassConstructor>()

    function walk(node: import('@banhmi/core').ModuleNode) {
      for (const imp of node.imports) walk(imp)
      for (const ctrl of node.controllers ?? []) {
        if (!seen.has(ctrl as ClassConstructor)) {
          seen.add(ctrl as ClassConstructor)
          result.push(ctrl as ClassConstructor)
        }
      }
    }

    walk(app.moduleTree)
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
```

Note: `ModuleNode` needs to be exported from `@banhmi/core`. Check:
```bash
grep -n "ModuleNode" packages/core/src/index.ts
```
If it is not exported, add `export type { ModuleNode } from './module-graph'` to `packages/core/src/index.ts`.

- [ ] **Step 3: Create `packages/swagger/src/index.ts`**

```ts
export { DocumentBuilder } from './document-builder'
export { SwaggerModule } from './swagger.module'
export { SwaggerExplorer } from './explorer'
export type { OpenApiDocument, OpenApiInfo, OpenApiServer, OpenApiComponents } from './types'
```

- [ ] **Step 4: Run all swagger tests**

```bash
cd packages/swagger && bun test test/swagger.test.ts
```
Expected: all passing.

- [ ] **Step 5: Wire into banhmi facade**

In `packages/banhmi/src/index.ts`, add:
```ts
export * from '@banhmi/testing'
export * from '@banhmi/swagger'
```

In `packages/banhmi/package.json` dependencies, add:
```json
"@banhmi/testing": "workspace:*",
"@banhmi/swagger": "workspace:*"
```

- [ ] **Step 6: Install**

```bash
bun install
```

- [ ] **Step 7: Run full test suite**

```bash
bun test --recursive
```
Expected: all passing.

- [ ] **Step 8: Commit**

```bash
git add packages/swagger/src/ packages/swagger/test/ packages/testing/ packages/banhmi/src/index.ts packages/banhmi/package.json bun.lock
git commit -m "feat(swagger): add SwaggerModule.setup; export @banhmi/testing and @banhmi/swagger from facade"
```
