# Bunnest v1 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@banhmi/common`, `@banhmi/core`, `@banhmi/platform-bun`, and the `bunnest` facade — a complete Bun-first HTTP framework with DI, modules, decorators, guards, interceptors, pipes, and exception filters.

**Architecture:** TC39 Stage 3 decorators with `Symbol.metadata` for metadata storage (no `reflect-metadata`). DI uses `static inject` token arrays. Route handlers receive a `RouteCtx` context object (TC39 Stage 3 has no parameter decorators). Radix router built on `Bun.serve` with Web Standard `Request`/`Response`. No RxJS — interceptors use `Promise<Response>`.

**Tech Stack:** Bun 1.x, TypeScript 5.2+, TC39 Stage 3 decorators, Biome (lint/format), Changesets (versioning)

---

## Spec Amendment (applied to spec file)

- `@Param`, `@Query`, `@Body` parameter decorators are replaced by `RouteCtx` context object
- `BunnestFactory` lives in `@banhmi/platform-bun`, re-exported by `bunnest` facade
- Package `bunnest` (unscoped) added as user-facing facade

---

## File Structure

```
packages/
  common/
    src/
      token.ts
      metadata-keys.ts
      decorators/
        injectable.ts
        module.ts
        controller.ts
        route.ts            # @Get, @Post, @Put, @Patch, @Delete, @Options, @Head, @All
        http.ts             # @HttpCode, @Header, @Redirect
        enhancers.ts        # @UseGuards, @UseInterceptors, @UseFilters, @UsePipes, @SetMetadata
      interfaces/
        route-ctx.ts        # RouteCtx interface
        execution-context.ts
        guard.ts
        pipe.ts
        interceptor.ts
        call-handler.ts
        filter.ts
        lifecycle.ts
      exceptions/
        http-exception.ts
        http-exceptions.ts
      pipes/
        parse-int.pipe.ts
        parse-uuid.pipe.ts
        parse-bool.pipe.ts
        validation.pipe.ts
      index.ts
    test/
      token.test.ts
      decorators/
        injectable.test.ts
        module.test.ts
        controller.test.ts
        route.test.ts
        enhancers.test.ts
      exceptions.test.ts
      pipes/
        parse-int.test.ts
        parse-uuid.test.ts
        parse-bool.test.ts
        validation.test.ts
    package.json
    tsconfig.json

  core/
    src/
      provider.ts           # Provider type definitions + helpers
      module-graph.ts       # ModuleGraph — build DAG, detect circular deps
      container.ts          # Container — resolve providers
      lifecycle-runner.ts   # Run lifecycle hooks on all providers
      application.ts        # BunnestApplication
      index.ts
    test/
      module-graph.test.ts
      container.test.ts
      lifecycle-runner.test.ts
    package.json
    tsconfig.json

  platform-bun/
    src/
      router.ts             # RadixRouter
      route-ctx.ts          # BunRouteCtx implements RouteCtx
      execution-context.ts  # BunExecutionContext implements ExecutionContext
      enhancer-pipeline.ts  # Guard → Interceptor → Handler → Filter
      route-explorer.ts     # Extract route definitions from controller metadata
      global-filter.ts      # GlobalExceptionFilter
      bun-adapter.ts        # BunAdapter — wires Bun.serve with router + pipeline
      factory.ts            # BunnestFactory.create()
      index.ts
    test/
      router.test.ts
      route-ctx.test.ts
      enhancer-pipeline.test.ts
      route-explorer.test.ts
      integration.test.ts
    package.json
    tsconfig.json

  bunnest/
    src/
      index.ts              # Re-exports @banhmi/common + core + platform-bun
    package.json
    tsconfig.json
```

---

### Task 1: Monorepo & tooling setup

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.json` (root)
- Create: `biome.json`
- Create: `.changeset/config.json`
- Create: `packages/common/package.json`
- Create: `packages/common/tsconfig.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/platform-bun/package.json`
- Create: `packages/platform-bun/tsconfig.json`
- Create: `packages/bunnest/package.json`
- Create: `packages/bunnest/tsconfig.json`

- [ ] **Step 1: Initialise git and root package**

```bash
cd /path/to/bunnest
git init
```

Create `package.json`:
```json
{
  "name": "bunnest-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --filter='*' build",
    "test": "bun test --recursive",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@changesets/cli": "^2.27.0"
  }
}
```

- [ ] **Step 2: Create root tsconfig**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Create biome config**

Create `biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "files": {
    "ignore": ["**/dist/**", "**/node_modules/**"]
  }
}
```

- [ ] **Step 4: Create @banhmi/common package files**

Create `packages/common/package.json`:
```json
{
  "name": "@banhmi/common",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target=bun",
    "test": "bun test"
  }
}
```

Create `packages/common/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src", "test"]
}
```

Create empty `packages/common/src/index.ts`:
```ts
// @banhmi/common — populated in subsequent tasks
```

- [ ] **Step 5: Create @banhmi/core package files**

Create `packages/core/package.json`:
```json
{
  "name": "@banhmi/core",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target=bun",
    "test": "bun test"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*"
  }
}
```

Create `packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src", "test"]
}
```

Create empty `packages/core/src/index.ts`:
```ts
// @banhmi/core — populated in subsequent tasks
```

- [ ] **Step 6: Create @banhmi/platform-bun package files**

Create `packages/platform-bun/package.json`:
```json
{
  "name": "@banhmi/platform-bun",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target=bun",
    "test": "bun test"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*",
    "@banhmi/core": "workspace:*"
  }
}
```

Create `packages/platform-bun/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src", "test"]
}
```

Create empty `packages/platform-bun/src/index.ts`:
```ts
// @banhmi/platform-bun — populated in subsequent tasks
```

- [ ] **Step 7: Create bunnest facade package files**

Create `packages/bunnest/package.json`:
```json
{
  "name": "banhmi",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target=bun",
    "test": "bun test"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*",
    "@banhmi/core": "workspace:*",
    "@banhmi/platform-bun": "workspace:*"
  }
}
```

Create `packages/bunnest/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "./dist" },
  "include": ["src"]
}
```

Create `packages/bunnest/src/index.ts`:
```ts
export * from '@banhmi/common'
export * from '@banhmi/core'
export * from '@banhmi/platform-bun'
```

- [ ] **Step 8: Install dependencies and verify workspace**

```bash
bun install
```

Expected: lockfile created, all workspace packages symlinked in `node_modules/@bunnest/`.

- [ ] **Step 9: Initialise changesets**

```bash
bunx changeset init
```

Expected: `.changeset/config.json` created.

- [ ] **Step 10: Initial commit**

```bash
git add .
git commit -m "chore: initialise monorepo with bun workspaces"
```

---

### Task 2: @banhmi/common — Token type & metadata keys

**Files:**
- Create: `packages/common/src/token.ts`
- Create: `packages/common/src/metadata-keys.ts`
- Create: `packages/common/test/token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/common/test/token.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { Token } from '../src/token'

describe('Token', () => {
  test('each call produces a unique symbol', () => {
    const a = Token<string>('greeting')
    const b = Token<string>('greeting')
    expect(a).not.toBe(b)
    expect(typeof a).toBe('symbol')
  })

  test('description is preserved', () => {
    const t = Token<number>('port')
    expect(t.description).toBe('port')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/common && bun test test/token.test.ts
```

Expected: `Cannot find module '../src/token'`

- [ ] **Step 3: Implement Token**

Create `packages/common/src/token.ts`:
```ts
export type Token<T> = symbol & { readonly __phantom_type__: T }

export function Token<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>
}
```

- [ ] **Step 4: Create metadata keys**

Create `packages/common/src/metadata-keys.ts`:
```ts
export const INJECTABLE_WATERMARK = Symbol('bunnest:injectable')
export const MODULE_METADATA = Symbol('bunnest:module')
export const CONTROLLER_METADATA = Symbol('bunnest:controller')
export const ROUTE_METADATA = Symbol('bunnest:routes')
export const HTTP_CODE_METADATA = Symbol('bunnest:http_code')
export const RESPONSE_HEADERS_METADATA = Symbol('bunnest:response_headers')
export const REDIRECT_METADATA = Symbol('bunnest:redirect')
export const GUARDS_METADATA = Symbol('bunnest:guards')
export const INTERCEPTORS_METADATA = Symbol('bunnest:interceptors')
export const FILTERS_METADATA = Symbol('bunnest:filters')
export const PIPES_METADATA = Symbol('bunnest:pipes')
export const CUSTOM_ROUTE_METADATA = Symbol('bunnest:custom_metadata')
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
cd packages/common && bun test test/token.test.ts
```

Expected: 2 passing

- [ ] **Step 6: Commit**

```bash
git add packages/common/src/token.ts packages/common/src/metadata-keys.ts packages/common/test/token.test.ts
git commit -m "feat(@banhmi/common): add Token type and metadata key symbols"
```

---

### Task 3: @banhmi/common — @Injectable and @Module decorators

**Files:**
- Create: `packages/common/src/decorators/injectable.ts`
- Create: `packages/common/src/decorators/module.ts`
- Create: `packages/common/test/decorators/injectable.test.ts`
- Create: `packages/common/test/decorators/module.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/common/test/decorators/injectable.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { Injectable } from '../../src/decorators/injectable'
import { INJECTABLE_WATERMARK } from '../../src/metadata-keys'

describe('@Injectable', () => {
  test('marks a class as injectable', () => {
    @Injectable()
    class TestService {}

    const meta = TestService[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[INJECTABLE_WATERMARK]).toBe(true)
  })

  test('unmarked class has no injectable metadata', () => {
    class PlainClass {}
    const meta = PlainClass[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[INJECTABLE_WATERMARK]).toBeUndefined()
  })
})
```

Create `packages/common/test/decorators/module.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { Module } from '../../src/decorators/module'
import { Injectable } from '../../src/decorators/injectable'
import { MODULE_METADATA } from '../../src/metadata-keys'

describe('@Module', () => {
  test('stores module metadata on the class', () => {
    @Injectable()
    class SomeService {}

    @Module({ providers: [SomeService] })
    class AppModule {}

    const meta = AppModule[Symbol.metadata] as Record<symbol, unknown> | null
    const moduleMeta = meta?.[MODULE_METADATA] as { providers: unknown[] } | undefined
    expect(moduleMeta?.providers).toContain(SomeService)
  })

  test('stores empty arrays when no metadata provided', () => {
    @Module({})
    class EmptyModule {}

    const meta = EmptyModule[Symbol.metadata] as Record<symbol, unknown> | null
    const moduleMeta = meta?.[MODULE_METADATA] as Record<string, unknown> | undefined
    expect(moduleMeta).toBeDefined()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/common && bun test test/decorators/
```

Expected: module not found errors

- [ ] **Step 3: Implement @Injectable**

Create `packages/common/src/decorators/injectable.ts`:
```ts
import { INJECTABLE_WATERMARK } from '../metadata-keys'

export function Injectable() {
  return function <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void {
    context.metadata[INJECTABLE_WATERMARK] = true
  }
}
```

- [ ] **Step 4: Implement @Module**

Create `packages/common/src/decorators/module.ts`:
```ts
import { MODULE_METADATA } from '../metadata-keys'
import type { ModuleMetadata } from '../interfaces/module-metadata'

export function Module(metadata: ModuleMetadata) {
  return function <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void {
    context.metadata[MODULE_METADATA] = metadata
  }
}
```

Create `packages/common/src/interfaces/module-metadata.ts`:
```ts
import type { Token } from '../token'

export type ClassConstructor<T = unknown> = new (...args: unknown[]) => T
export type AbstractConstructor<T = unknown> = abstract new (...args: unknown[]) => T
export type InjectToken<T = unknown> = Token<T> | ClassConstructor<T>

export type ValueProvider<T> = {
  provide: Token<T>
  useValue: T
}

export type FactoryProvider<T> = {
  provide: Token<T>
  useFactory: (...args: unknown[]) => T | Promise<T>
  inject?: InjectToken[]
}

export type ProviderDef<T = unknown> =
  | ClassConstructor<T>
  | ValueProvider<T>
  | FactoryProvider<T>

export interface ModuleMetadata {
  imports?: AbstractConstructor[]
  controllers?: ClassConstructor[]
  providers?: ProviderDef[]
  exports?: InjectToken[]
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
cd packages/common && bun test test/decorators/
```

Expected: 4 passing

- [ ] **Step 6: Commit**

```bash
git add packages/common/src/decorators/ packages/common/src/interfaces/module-metadata.ts packages/common/test/decorators/
git commit -m "feat(@banhmi/common): add @Injectable and @Module decorators"
```

---

### Task 4: @banhmi/common — @Controller & route method decorators

**Files:**
- Create: `packages/common/src/decorators/controller.ts`
- Create: `packages/common/src/decorators/route.ts`
- Create: `packages/common/test/decorators/controller.test.ts`
- Create: `packages/common/test/decorators/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/common/test/decorators/controller.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { Controller } from '../../src/decorators/controller'
import { CONTROLLER_METADATA } from '../../src/metadata-keys'

describe('@Controller', () => {
  test('stores prefix on class metadata', () => {
    @Controller('/cats')
    class CatsController {}

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[CONTROLLER_METADATA]).toEqual({ prefix: '/cats' })
  })

  test('defaults to empty prefix', () => {
    @Controller()
    class RootController {}

    const meta = RootController[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[CONTROLLER_METADATA]).toEqual({ prefix: '' })
  })
})
```

Create `packages/common/test/decorators/route.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { Get, Post, Delete, Put, Patch } from '../../src/decorators/route'
import { ROUTE_METADATA } from '../../src/metadata-keys'

describe('route decorators', () => {
  test('@Get stores route definition', () => {
    class CatsController {
      @Get('/cats')
      findAll() {}
    }

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown> | null
    const routes = meta?.[ROUTE_METADATA] as Record<string, unknown> | undefined
    expect(routes?.['findAll']).toEqual({ method: 'GET', path: '/cats' })
  })

  test('@Post stores POST route', () => {
    class CatsController {
      @Post()
      create() {}
    }

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown> | null
    const routes = meta?.[ROUTE_METADATA] as Record<string, unknown> | undefined
    expect(routes?.['create']).toEqual({ method: 'POST', path: '' })
  })

  test('multiple routes on same controller', () => {
    class CatsController {
      @Get('/:id')
      findOne() {}

      @Delete('/:id')
      remove() {}
    }

    const meta = CatsController[Symbol.metadata] as Record<symbol, unknown> | null
    const routes = meta?.[ROUTE_METADATA] as Record<string, { method: string }> | undefined
    expect(routes?.['findOne']?.method).toBe('GET')
    expect(routes?.['remove']?.method).toBe('DELETE')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/common && bun test test/decorators/controller.test.ts test/decorators/route.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement @Controller**

Create `packages/common/src/decorators/controller.ts`:
```ts
import { CONTROLLER_METADATA } from '../metadata-keys'

export interface ControllerMetadata {
  prefix: string
}

export function Controller(prefix = '') {
  return function <T extends abstract new (...args: unknown[]) => unknown>(
    _target: T,
    context: ClassDecoratorContext<T>,
  ): void {
    context.metadata[CONTROLLER_METADATA] = { prefix } satisfies ControllerMetadata
  }
}
```

- [ ] **Step 4: Implement route method decorators**

Create `packages/common/src/decorators/route.ts`:
```ts
import { ROUTE_METADATA } from '../metadata-keys'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export interface RouteDefinitionMeta {
  method: HttpMethod
  path: string
}

function createRouteDecorator(method: HttpMethod) {
  return function (path = '') {
    return function (
      _target: unknown,
      context: ClassMethodDecoratorContext,
    ): void {
      if (!context.metadata[ROUTE_METADATA]) {
        context.metadata[ROUTE_METADATA] = {}
      }
      const routes = context.metadata[ROUTE_METADATA] as Record<string, RouteDefinitionMeta>
      routes[context.name as string] = { method, path }
    }
  }
}

export const Get = createRouteDecorator('GET')
export const Post = createRouteDecorator('POST')
export const Put = createRouteDecorator('PUT')
export const Patch = createRouteDecorator('PATCH')
export const Delete = createRouteDecorator('DELETE')
export const Options = createRouteDecorator('OPTIONS')
export const Head = createRouteDecorator('HEAD')

export function All(path = '') {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[ROUTE_METADATA]) {
      context.metadata[ROUTE_METADATA] = {}
    }
    const routes = context.metadata[ROUTE_METADATA] as Record<string, RouteDefinitionMeta>
    routes[context.name as string] = { method: 'GET', path }
  }
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
cd packages/common && bun test test/decorators/controller.test.ts test/decorators/route.test.ts
```

Expected: 5 passing

- [ ] **Step 6: Commit**

```bash
git add packages/common/src/decorators/controller.ts packages/common/src/decorators/route.ts packages/common/test/decorators/controller.test.ts packages/common/test/decorators/route.test.ts
git commit -m "feat(@banhmi/common): add @Controller and route method decorators"
```

---

### Task 5: @banhmi/common — HTTP response & enhancer decorators

**Files:**
- Create: `packages/common/src/decorators/http.ts`
- Create: `packages/common/src/decorators/enhancers.ts`
- Create: `packages/common/test/decorators/enhancers.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/common/test/decorators/enhancers.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { UseGuards, UseInterceptors, UseFilters, SetMetadata } from '../../src/decorators/enhancers'
import { HttpCode, Header, Redirect } from '../../src/decorators/http'
import {
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  FILTERS_METADATA,
  HTTP_CODE_METADATA,
  RESPONSE_HEADERS_METADATA,
  REDIRECT_METADATA,
  CUSTOM_ROUTE_METADATA,
} from '../../src/metadata-keys'

describe('@HttpCode', () => {
  test('stores status code on method metadata', () => {
    class Ctrl {
      @HttpCode(201)
      create() {}
    }

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[HTTP_CODE_METADATA]).toEqual({ create: 201 })
  })
})

describe('@Header', () => {
  test('stores header on method metadata', () => {
    class Ctrl {
      @Header('Cache-Control', 'no-cache')
      findAll() {}
    }

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    const headers = meta?.[RESPONSE_HEADERS_METADATA] as Record<string, [string, string][]> | undefined
    expect(headers?.['findAll']).toContainEqual(['Cache-Control', 'no-cache'])
  })
})

describe('@UseGuards', () => {
  test('stores guards on class metadata', () => {
    class AuthGuard {}

    @UseGuards(AuthGuard)
    class Ctrl {}

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    expect(meta?.[GUARDS_METADATA]).toContain(AuthGuard)
  })
})

describe('@SetMetadata', () => {
  test('stores custom metadata on method', () => {
    class Ctrl {
      @SetMetadata('roles', ['admin'])
      findAll() {}
    }

    const meta = Ctrl[Symbol.metadata] as Record<symbol, unknown> | null
    const custom = meta?.[CUSTOM_ROUTE_METADATA] as Record<string, Record<string, unknown>> | undefined
    expect(custom?.['findAll']?.['roles']).toEqual(['admin'])
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/common && bun test test/decorators/enhancers.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement @HttpCode, @Header, @Redirect**

Create `packages/common/src/decorators/http.ts`:
```ts
import {
  HTTP_CODE_METADATA,
  REDIRECT_METADATA,
  RESPONSE_HEADERS_METADATA,
} from '../metadata-keys'

export function HttpCode(statusCode: number) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[HTTP_CODE_METADATA]) context.metadata[HTTP_CODE_METADATA] = {}
    ;(context.metadata[HTTP_CODE_METADATA] as Record<string, number>)[context.name as string] = statusCode
  }
}

export function Header(name: string, value: string) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[RESPONSE_HEADERS_METADATA]) context.metadata[RESPONSE_HEADERS_METADATA] = {}
    const headers = context.metadata[RESPONSE_HEADERS_METADATA] as Record<string, [string, string][]>
    if (!headers[context.name as string]) headers[context.name as string] = []
    headers[context.name as string]!.push([name, value])
  }
}

export function Redirect(url: string, statusCode = 302) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[REDIRECT_METADATA]) context.metadata[REDIRECT_METADATA] = {}
    ;(context.metadata[REDIRECT_METADATA] as Record<string, { url: string; statusCode: number }>)[
      context.name as string
    ] = { url, statusCode }
  }
}
```

- [ ] **Step 4: Implement enhancer decorators**

Create `packages/common/src/decorators/enhancers.ts`:
```ts
import {
  CUSTOM_ROUTE_METADATA,
  FILTERS_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  PIPES_METADATA,
} from '../metadata-keys'
import type { ClassConstructor } from '../interfaces/module-metadata'

function makeClassOrMethodDecorator(metaKey: symbol, values: ClassConstructor[]) {
  return function (
    _target: unknown,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): void {
    const existing = (context.metadata[metaKey] as ClassConstructor[] | undefined) ?? []
    context.metadata[metaKey] = [...existing, ...values]
  }
}

export function UseGuards(...guards: ClassConstructor[]) {
  return makeClassOrMethodDecorator(GUARDS_METADATA, guards)
}

export function UseInterceptors(...interceptors: ClassConstructor[]) {
  return makeClassOrMethodDecorator(INTERCEPTORS_METADATA, interceptors)
}

export function UseFilters(...filters: ClassConstructor[]) {
  return makeClassOrMethodDecorator(FILTERS_METADATA, filters)
}

export function UsePipes(...pipes: ClassConstructor[]) {
  return makeClassOrMethodDecorator(PIPES_METADATA, pipes)
}

export function SetMetadata(key: string, value: unknown) {
  return function (_target: unknown, context: ClassMethodDecoratorContext): void {
    if (!context.metadata[CUSTOM_ROUTE_METADATA]) context.metadata[CUSTOM_ROUTE_METADATA] = {}
    const custom = context.metadata[CUSTOM_ROUTE_METADATA] as Record<string, Record<string, unknown>>
    if (!custom[context.name as string]) custom[context.name as string] = {}
    custom[context.name as string]![key] = value
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd packages/common && bun test test/decorators/enhancers.test.ts
```

Expected: 5 passing

- [ ] **Step 6: Commit**

```bash
git add packages/common/src/decorators/http.ts packages/common/src/decorators/enhancers.ts packages/common/test/decorators/enhancers.test.ts
git commit -m "feat(@banhmi/common): add HTTP response and enhancer decorators"
```

---

### Task 6: @banhmi/common — Interfaces (RouteCtx, ExecutionContext, enhancers)

**Files:**
- Create: `packages/common/src/interfaces/route-ctx.ts`
- Create: `packages/common/src/interfaces/execution-context.ts`
- Create: `packages/common/src/interfaces/guard.ts`
- Create: `packages/common/src/interfaces/pipe.ts`
- Create: `packages/common/src/interfaces/interceptor.ts`
- Create: `packages/common/src/interfaces/call-handler.ts`
- Create: `packages/common/src/interfaces/filter.ts`
- Create: `packages/common/src/interfaces/lifecycle.ts`

These are type-only files — no tests needed.

- [ ] **Step 1: Create RouteCtx interface**

Create `packages/common/src/interfaces/route-ctx.ts`:
```ts
export interface RouteCtx {
  readonly request: Request
  readonly params: Readonly<Record<string, string>>
  readonly query: URLSearchParams
  readonly headers: Headers
  readonly ip: string
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
}
```

- [ ] **Step 2: Create ExecutionContext interface**

Create `packages/common/src/interfaces/execution-context.ts`:
```ts
import type { RouteCtx } from './route-ctx'

export interface ExecutionContext {
  getCtx(): RouteCtx
  getHandler(): (...args: unknown[]) => unknown
  getClass(): new (...args: unknown[]) => unknown
}
```

- [ ] **Step 3: Create Guard interface**

Create `packages/common/src/interfaces/guard.ts`:
```ts
import type { ExecutionContext } from './execution-context'

export interface Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>
}
```

- [ ] **Step 4: Create CallHandler and Interceptor interfaces**

Create `packages/common/src/interfaces/call-handler.ts`:
```ts
export interface CallHandler {
  handle(): Promise<Response>
}
```

Create `packages/common/src/interfaces/interceptor.ts`:
```ts
import type { CallHandler } from './call-handler'
import type { ExecutionContext } from './execution-context'

export interface Interceptor {
  intercept(context: ExecutionContext, next: CallHandler): Promise<Response>
}
```

- [ ] **Step 5: Create Pipe and ExceptionFilter interfaces**

Create `packages/common/src/interfaces/pipe.ts`:
```ts
export interface PipeTransform<T = unknown, R = unknown> {
  transform(value: T, metadata: PipeMetadata): R | Promise<R>
}

export interface PipeMetadata {
  type: 'param' | 'query' | 'body' | 'custom'
  data?: string
}
```

Create `packages/common/src/interfaces/filter.ts`:
```ts
import type { ExecutionContext } from './execution-context'

export interface ExceptionFilter<T = unknown> {
  catch(exception: T, context: ExecutionContext): Response | Promise<Response>
}
```

- [ ] **Step 6: Create lifecycle interfaces**

Create `packages/common/src/interfaces/lifecycle.ts`:
```ts
export interface OnModuleInit {
  onModuleInit(): void | Promise<void>
}

export interface OnApplicationBootstrap {
  onApplicationBootstrap(): void | Promise<void>
}

export interface OnModuleDestroy {
  onModuleDestroy(): void | Promise<void>
}

export interface OnApplicationShutdown {
  onApplicationShutdown(signal?: string): void | Promise<void>
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/common/src/interfaces/
git commit -m "feat(@banhmi/common): add RouteCtx, ExecutionContext, and enhancer interfaces"
```

---

### Task 7: @banhmi/common — HttpException hierarchy

**Files:**
- Create: `packages/common/src/exceptions/http-exception.ts`
- Create: `packages/common/src/exceptions/http-exceptions.ts`
- Create: `packages/common/test/exceptions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/common/test/exceptions.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { HttpException } from '../src/exceptions/http-exception'
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '../src/exceptions/http-exceptions'

describe('HttpException', () => {
  test('stores message and statusCode', () => {
    const ex = new HttpException('oops', 418)
    expect(ex.message).toBe('oops')
    expect(ex.statusCode).toBe(418)
  })

  test('stores cause', () => {
    const cause = new Error('root')
    const ex = new HttpException('wrapper', 500, { cause })
    expect(ex.cause).toBe(cause)
  })

  test('is instanceof Error', () => {
    expect(new HttpException('x', 400)).toBeInstanceOf(Error)
  })
})

describe('status-specific exceptions', () => {
  test('BadRequestException has statusCode 400', () => {
    expect(new BadRequestException('bad').statusCode).toBe(400)
  })

  test('NotFoundException has statusCode 404', () => {
    expect(new NotFoundException('not found').statusCode).toBe(404)
  })

  test('ForbiddenException has statusCode 403', () => {
    expect(new ForbiddenException().statusCode).toBe(403)
  })

  test('UnauthorizedException has statusCode 401', () => {
    expect(new UnauthorizedException().statusCode).toBe(401)
  })

  test('ConflictException has statusCode 409', () => {
    expect(new ConflictException('conflict').statusCode).toBe(409)
  })

  test('UnprocessableEntityException has statusCode 422', () => {
    expect(new UnprocessableEntityException('invalid').statusCode).toBe(422)
  })

  test('InternalServerErrorException has statusCode 500', () => {
    expect(new InternalServerErrorException().statusCode).toBe(500)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/common && bun test test/exceptions.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement HttpException**

Create `packages/common/src/exceptions/http-exception.ts`:
```ts
export class HttpException extends Error {
  readonly statusCode: number

  constructor(
    message: string,
    statusCode: number,
    options?: { cause?: Error },
  ) {
    super(message, { cause: options?.cause })
    this.statusCode = statusCode
    this.name = this.constructor.name
  }
}
```

- [ ] **Step 4: Implement status-specific subclasses**

Create `packages/common/src/exceptions/http-exceptions.ts`:
```ts
import { HttpException } from './http-exception'

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request', options?: { cause?: Error }) {
    super(message, 400, options)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized', options?: { cause?: Error }) {
    super(message, 401, options)
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden', options?: { cause?: Error }) {
    super(message, 403, options)
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found', options?: { cause?: Error }) {
    super(message, 404, options)
  }
}

export class MethodNotAllowedException extends HttpException {
  constructor(message = 'Method Not Allowed', options?: { cause?: Error }) {
    super(message, 405, options)
  }
}

export class ConflictException extends HttpException {
  constructor(message = 'Conflict', options?: { cause?: Error }) {
    super(message, 409, options)
  }
}

export class GoneException extends HttpException {
  constructor(message = 'Gone', options?: { cause?: Error }) {
    super(message, 410, options)
  }
}

export class UnprocessableEntityException extends HttpException {
  constructor(message = 'Unprocessable Entity', options?: { cause?: Error }) {
    super(message, 422, options)
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message = 'Too Many Requests', options?: { cause?: Error }) {
    super(message, 429, options)
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message = 'Internal Server Error', options?: { cause?: Error }) {
    super(message, 500, options)
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd packages/common && bun test test/exceptions.test.ts
```

Expected: 10 passing

- [ ] **Step 6: Commit**

```bash
git add packages/common/src/exceptions/ packages/common/test/exceptions.test.ts
git commit -m "feat(@banhmi/common): add HttpException hierarchy"
```

---

### Task 8: @banhmi/common — Built-in pipes

**Files:**
- Create: `packages/common/src/pipes/parse-int.pipe.ts`
- Create: `packages/common/src/pipes/parse-uuid.pipe.ts`
- Create: `packages/common/src/pipes/parse-bool.pipe.ts`
- Create: `packages/common/src/pipes/validation.pipe.ts`
- Create: `packages/common/test/pipes/parse-int.test.ts`
- Create: `packages/common/test/pipes/parse-uuid.test.ts`
- Create: `packages/common/test/pipes/parse-bool.test.ts`
- Create: `packages/common/test/pipes/validation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/common/test/pipes/parse-int.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { ParseIntPipe } from '../../src/pipes/parse-int.pipe'
import { BadRequestException } from '../../src/exceptions/http-exceptions'

describe('ParseIntPipe', () => {
  const pipe = new ParseIntPipe()

  test('parses valid integer string', () => {
    expect(pipe.transform('42', { type: 'param' })).toBe(42)
  })

  test('throws BadRequestException for non-integer', () => {
    expect(() => pipe.transform('abc', { type: 'param' })).toThrow(BadRequestException)
  })

  test('throws for decimal string', () => {
    expect(() => pipe.transform('3.14', { type: 'param' })).toThrow(BadRequestException)
  })
})
```

Create `packages/common/test/pipes/parse-uuid.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { ParseUUIDPipe } from '../../src/pipes/parse-uuid.pipe'
import { BadRequestException } from '../../src/exceptions/http-exceptions'

describe('ParseUUIDPipe', () => {
  const pipe = new ParseUUIDPipe()

  test('accepts valid UUID v4', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(pipe.transform(uuid, { type: 'param' })).toBe(uuid)
  })

  test('throws for invalid UUID', () => {
    expect(() => pipe.transform('not-a-uuid', { type: 'param' })).toThrow(BadRequestException)
  })
})
```

Create `packages/common/test/pipes/parse-bool.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { ParseBoolPipe } from '../../src/pipes/parse-bool.pipe'
import { BadRequestException } from '../../src/exceptions/http-exceptions'

describe('ParseBoolPipe', () => {
  const pipe = new ParseBoolPipe()

  test('"true" → true', () => {
    expect(pipe.transform('true', { type: 'query' })).toBe(true)
  })

  test('"false" → false', () => {
    expect(pipe.transform('false', { type: 'query' })).toBe(false)
  })

  test('throws for anything else', () => {
    expect(() => pipe.transform('yes', { type: 'query' })).toThrow(BadRequestException)
  })
})
```

Create `packages/common/test/pipes/validation.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { ValidationPipe } from '../../src/pipes/validation.pipe'
import { BadRequestException } from '../../src/exceptions/http-exceptions'

// Minimal Standard Schema-compatible schema for testing without adding a dep
const numberSchema = {
  '~standard': {
    vendor: 'test',
    version: 1,
    validate: (v: unknown) =>
      typeof v === 'number' && v >= 0
        ? { value: v }
        : { issues: [{ message: 'Must be a non-negative number' }] },
  },
}

describe('ValidationPipe', () => {
  test('passes through valid value', async () => {
    const pipe = new ValidationPipe(numberSchema)
    await expect(pipe.transform(42, { type: 'body' })).resolves.toBe(42)
  })

  test('throws BadRequestException for invalid value', async () => {
    const pipe = new ValidationPipe(numberSchema)
    await expect(pipe.transform(-1, { type: 'body' })).rejects.toBeInstanceOf(BadRequestException)
  })
})
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd packages/common && bun test test/pipes/
```

Expected: module not found

- [ ] **Step 3: Implement ParseIntPipe**

Create `packages/common/src/pipes/parse-int.pipe.ts`:
```ts
import { BadRequestException } from '../exceptions/http-exceptions'
import type { PipeMetadata, PipeTransform } from '../interfaces/pipe'

export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, _metadata: PipeMetadata): number {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || String(parsed) !== value) {
      throw new BadRequestException(`"${value}" is not a valid integer`)
    }
    return parsed
  }
}
```

- [ ] **Step 4: Implement ParseUUIDPipe**

Create `packages/common/src/pipes/parse-uuid.pipe.ts`:
```ts
import { BadRequestException } from '../exceptions/http-exceptions'
import type { PipeMetadata, PipeTransform } from '../interfaces/pipe'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string, _metadata: PipeMetadata): string {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException(`"${value}" is not a valid UUID`)
    }
    return value
  }
}
```

- [ ] **Step 5: Implement ParseBoolPipe**

Create `packages/common/src/pipes/parse-bool.pipe.ts`:
```ts
import { BadRequestException } from '../exceptions/http-exceptions'
import type { PipeMetadata, PipeTransform } from '../interfaces/pipe'

export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string, _metadata: PipeMetadata): boolean {
    if (value === 'true') return true
    if (value === 'false') return false
    throw new BadRequestException(`"${value}" is not a valid boolean (use "true" or "false")`)
  }
}
```

- [ ] **Step 6: Implement ValidationPipe with Standard Schema**

Create `packages/common/src/pipes/validation.pipe.ts`:
```ts
import { BadRequestException } from '../exceptions/http-exceptions'
import type { PipeMetadata, PipeTransform } from '../interfaces/pipe'

interface StandardSchemaResult<T> {
  value?: T
  issues?: { message: string }[]
}

interface StandardSchema<T = unknown> {
  '~standard': {
    vendor: string
    version: number
    validate(value: unknown): StandardSchemaResult<T> | Promise<StandardSchemaResult<T>>
  }
}

export class ValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: StandardSchema<T>) {}

  async transform(value: unknown, _metadata: PipeMetadata): Promise<T> {
    const result = await this.schema['~standard'].validate(value)
    if (result.issues && result.issues.length > 0) {
      const message = result.issues.map((i) => i.message).join('; ')
      throw new BadRequestException(message)
    }
    return result.value as T
  }
}
```

- [ ] **Step 7: Run all pipe tests**

```bash
cd packages/common && bun test test/pipes/
```

Expected: 8 passing

- [ ] **Step 8: Wire up @banhmi/common index**

Update `packages/common/src/index.ts`:
```ts
export { Token } from './token'
export type { Token as TokenType } from './token'
export * from './metadata-keys'

// Decorators
export { Injectable } from './decorators/injectable'
export { Module } from './decorators/module'
export { Controller } from './decorators/controller'
export type { ControllerMetadata } from './decorators/controller'
export { Get, Post, Put, Patch, Delete, Options, Head, All } from './decorators/route'
export type { HttpMethod, RouteDefinitionMeta } from './decorators/route'
export { HttpCode, Header, Redirect } from './decorators/http'
export { UseGuards, UseInterceptors, UseFilters, UsePipes, SetMetadata } from './decorators/enhancers'

// Interfaces
export type { ModuleMetadata, ProviderDef, ValueProvider, FactoryProvider, ClassConstructor, AbstractConstructor, InjectToken } from './interfaces/module-metadata'
export type { RouteCtx } from './interfaces/route-ctx'
export type { ExecutionContext } from './interfaces/execution-context'
export type { Guard } from './interfaces/guard'
export type { PipeTransform, PipeMetadata } from './interfaces/pipe'
export type { Interceptor } from './interfaces/interceptor'
export type { CallHandler } from './interfaces/call-handler'
export type { ExceptionFilter } from './interfaces/filter'
export type { OnModuleInit, OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown } from './interfaces/lifecycle'

// Exceptions
export { HttpException } from './exceptions/http-exception'
export {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  ConflictException,
  GoneException,
  UnprocessableEntityException,
  TooManyRequestsException,
  InternalServerErrorException,
} from './exceptions/http-exceptions'

// Pipes
export { ParseIntPipe } from './pipes/parse-int.pipe'
export { ParseUUIDPipe } from './pipes/parse-uuid.pipe'
export { ParseBoolPipe } from './pipes/parse-bool.pipe'
export { ValidationPipe } from './pipes/validation.pipe'
```

- [ ] **Step 9: Run all @banhmi/common tests**

```bash
cd packages/common && bun test
```

Expected: all passing

- [ ] **Step 10: Commit**

```bash
git add packages/common/
git commit -m "feat(@banhmi/common): add built-in pipes and wire up package index"
```

---

### Task 9: @banhmi/core — Provider types, module graph, and DI container

**Files:**
- Create: `packages/core/src/provider.ts`
- Create: `packages/core/src/module-graph.ts`
- Create: `packages/core/src/container.ts`
- Create: `packages/core/test/module-graph.test.ts`
- Create: `packages/core/test/container.test.ts`

- [ ] **Step 1: Write module graph tests**

Create `packages/core/test/module-graph.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { ModuleGraph } from '../src/module-graph'
import { Injectable } from '@banhmi/common'
import { Module } from '@banhmi/common'

describe('ModuleGraph', () => {
  test('builds a single-module tree', () => {
    @Injectable()
    class AppService {}

    @Module({ providers: [AppService] })
    class AppModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)

    expect(tree.module).toBe(AppModule)
    expect(tree.providers).toContain(AppService)
    expect(tree.imports).toHaveLength(0)
  })

  test('traverses imports recursively', () => {
    @Injectable()
    class CatsService {}

    @Module({ providers: [CatsService], exports: [CatsService] })
    class CatsModule {}

    @Module({ imports: [CatsModule] })
    class AppModule {}

    const graph = new ModuleGraph()
    const tree = graph.buildTree(AppModule)

    expect(tree.imports).toHaveLength(1)
    expect(tree.imports[0]?.module).toBe(CatsModule)
  })

  test('throws on circular dependency', () => {
    // Build circular dependency using a lazy reference trick for testing
    class ModuleA {}
    class ModuleB {}

    // Manually set metadata to create circular ref
    Object.defineProperty(ModuleA, Symbol.metadata, {
      value: {
        [Symbol.for('bunnest:module')]: { imports: [ModuleB] },
      },
    })
    Object.defineProperty(ModuleB, Symbol.metadata, {
      value: {
        [Symbol.for('bunnest:module')]: { imports: [ModuleA] },
      },
    })

    const graph = new ModuleGraph()
    expect(() => graph.buildTree(ModuleA as never)).toThrow(/circular/i)
  })
})
```

- [ ] **Step 2: Write container tests**

Create `packages/core/test/container.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { Container } from '../src/container'
import { Token, Injectable } from '@banhmi/common'

describe('Container', () => {
  test('resolves a class provider as singleton by default', () => {
    @Injectable()
    class SomeService {
      static inject = [] as const
      value = Math.random()
    }

    const container = new Container()
    container.register(SomeService)

    const a = container.resolve(SomeService)
    const b = container.resolve(SomeService)
    expect(a).toBe(b)
    expect(a).toBeInstanceOf(SomeService)
  })

  test('resolves a value provider', () => {
    const GREETING = Token<string>('greeting')
    const container = new Container()
    container.register({ provide: GREETING, useValue: 'hello' })

    expect(container.resolve(GREETING)).toBe('hello')
  })

  test('resolves a factory provider', () => {
    const RAND = Token<number>('rand')
    const container = new Container()
    container.register({ provide: RAND, useFactory: () => 42 })

    expect(container.resolve(RAND)).toBe(42)
  })

  test('injects dependencies', () => {
    @Injectable()
    class Logger {
      static inject = [] as const
      log(msg: string) { return msg }
    }

    @Injectable()
    class AppService {
      static inject = [Logger] as const
      constructor(readonly logger: Logger) {}
    }

    const container = new Container()
    container.register(Logger)
    container.register(AppService)

    const service = container.resolve(AppService)
    expect(service.logger).toBeInstanceOf(Logger)
    expect(service.logger.log('hi')).toBe('hi')
  })

  test('throws when token not registered', () => {
    const MISSING = Token<string>('missing')
    const container = new Container()
    expect(() => container.resolve(MISSING)).toThrow()
  })

  test('factory provider with inject array', () => {
    const BASE_URL = Token<string>('baseUrl')
    const CLIENT_TOKEN = Token<{ url: string }>('client')

    const container = new Container()
    container.register({ provide: BASE_URL, useValue: 'https://api.example.com' })
    container.register({
      provide: CLIENT_TOKEN,
      useFactory: (url: unknown) => ({ url: url as string }),
      inject: [BASE_URL],
    })

    const client = container.resolve(CLIENT_TOKEN)
    expect(client.url).toBe('https://api.example.com')
  })
})
```

- [ ] **Step 3: Run to confirm failures**

```bash
cd packages/core && bun test
```

Expected: module not found

- [ ] **Step 4: Implement provider helpers**

Create `packages/core/src/provider.ts`:
```ts
import type { ClassConstructor, FactoryProvider, InjectToken, ProviderDef, ValueProvider } from '@banhmi/common'

export function isValueProvider<T>(def: ProviderDef<T>): def is ValueProvider<T> {
  return typeof def === 'object' && 'useValue' in def
}

export function isFactoryProvider<T>(def: ProviderDef<T>): def is FactoryProvider<T> {
  return typeof def === 'object' && 'useFactory' in def
}

export function isClassProvider<T>(def: ProviderDef<T>): def is ClassConstructor<T> {
  return typeof def === 'function'
}

export function getProviderToken(def: ProviderDef): symbol | ClassConstructor {
  if (isClassProvider(def)) return def
  return def.provide as symbol
}

export function getInjectTokens(def: ProviderDef): InjectToken[] {
  if (isClassProvider(def)) {
    return (def as { inject?: InjectToken[] }).inject ?? []
  }
  if (isFactoryProvider(def)) {
    return def.inject ?? []
  }
  return []
}
```

- [ ] **Step 5: Implement ModuleGraph**

Create `packages/core/src/module-graph.ts`:
```ts
import type { AbstractConstructor, ModuleMetadata } from '@banhmi/common'
import { MODULE_METADATA } from '@banhmi/common'

export interface ModuleNode {
  module: AbstractConstructor
  providers: ModuleMetadata['providers']
  controllers: ModuleMetadata['controllers']
  exports: ModuleMetadata['exports']
  imports: ModuleNode[]
}

function getModuleMetadata(target: AbstractConstructor): ModuleMetadata {
  const meta = (target[Symbol.metadata] as Record<symbol, unknown> | null)?.[MODULE_METADATA]
  if (!meta) throw new Error(`${target.name} is not a @Module`)
  return meta as ModuleMetadata
}

export class ModuleGraph {
  private visited = new Map<AbstractConstructor, ModuleNode>()
  private visiting = new Set<AbstractConstructor>()

  buildTree(rootModule: AbstractConstructor): ModuleNode {
    if (this.visiting.has(rootModule)) {
      throw new Error(
        `Circular module dependency detected involving ${rootModule.name}`,
      )
    }

    const cached = this.visited.get(rootModule)
    if (cached) return cached

    this.visiting.add(rootModule)

    const meta = getModuleMetadata(rootModule)
    const node: ModuleNode = {
      module: rootModule,
      providers: meta.providers ?? [],
      controllers: meta.controllers ?? [],
      exports: meta.exports ?? [],
      imports: (meta.imports ?? []).map((m) => this.buildTree(m)),
    }

    this.visiting.delete(rootModule)
    this.visited.set(rootModule, node)

    return node
  }

  /** Flattens the tree into a single list of all providers across all modules. */
  flattenProviders(node: ModuleNode): NonNullable<ModuleMetadata['providers']> {
    const providers: NonNullable<ModuleMetadata['providers']> = []
    const seen = new Set<AbstractConstructor>()

    function walk(n: ModuleNode) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      providers.push(...(n.providers ?? []))
      providers.push(...(n.controllers ?? []))
    }

    walk(node)
    return providers
  }
}
```

- [ ] **Step 6: Implement Container**

Create `packages/core/src/container.ts`:
```ts
import type { ClassConstructor, InjectToken, ProviderDef } from '@banhmi/common'
import {
  getInjectTokens,
  getProviderToken,
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
} from './provider'

export class Container {
  private providers = new Map<symbol | ClassConstructor, ProviderDef>()
  private singletons = new Map<symbol | ClassConstructor, unknown>()

  register(def: ProviderDef): void {
    const token = getProviderToken(def)
    this.providers.set(token as symbol | ClassConstructor, def)
  }

  resolve<T>(token: InjectToken<T>): T {
    const key = token as symbol | ClassConstructor

    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T
    }

    const def = this.providers.get(key)
    if (!def) {
      const name = typeof key === 'symbol' ? String(key) : (key as ClassConstructor).name
      throw new Error(`No provider registered for token: ${name}`)
    }

    const instance = this.instantiate(def) as T
    this.singletons.set(key, instance)
    return instance
  }

  private instantiate(def: ProviderDef): unknown {
    if (isValueProvider(def)) return def.useValue

    if (isFactoryProvider(def)) {
      const args = (def.inject ?? []).map((t) => this.resolve(t))
      return def.useFactory(...args)
    }

    if (isClassProvider(def)) {
      const inject = getInjectTokens(def)
      const args = inject.map((t) => this.resolve(t))
      return new def(...args)
    }

    throw new Error('Unknown provider definition')
  }
}
```

- [ ] **Step 7: Run tests**

```bash
cd packages/core && bun test
```

Expected: all passing

- [ ] **Step 8: Wire up core index**

Update `packages/core/src/index.ts`:
```ts
export { ModuleGraph } from './module-graph'
export type { ModuleNode } from './module-graph'
export { Container } from './container'
```

- [ ] **Step 9: Commit**

```bash
git add packages/core/
git commit -m "feat(@banhmi/core): add module graph and DI container"
```

---

### Task 10: @banhmi/core — Lifecycle runner & BunnestApplication

**Files:**
- Create: `packages/core/src/lifecycle-runner.ts`
- Create: `packages/core/src/application.ts`
- Create: `packages/core/test/lifecycle-runner.test.ts`

- [ ] **Step 1: Write lifecycle runner tests**

Create `packages/core/test/lifecycle-runner.test.ts`:
```ts
import { expect, test, describe, mock } from 'bun:test'
import { LifecycleRunner } from '../src/lifecycle-runner'
import { Container } from '../src/container'
import { Injectable } from '@banhmi/common'

describe('LifecycleRunner', () => {
  test('calls onModuleInit on providers that implement it', async () => {
    const initFn = mock(() => Promise.resolve())

    @Injectable()
    class InitService {
      static inject = [] as const
      onModuleInit = initFn
    }

    @Injectable()
    class PlainService {
      static inject = [] as const
    }

    const container = new Container()
    container.register(InitService)
    container.register(PlainService)

    const runner = new LifecycleRunner(container)
    await runner.runModuleInit([InitService, PlainService])

    expect(initFn).toHaveBeenCalledTimes(1)
  })

  test('calls onModuleDestroy on providers that implement it', async () => {
    const destroyFn = mock(() => Promise.resolve())

    @Injectable()
    class CleanupService {
      static inject = [] as const
      onModuleDestroy = destroyFn
    }

    const container = new Container()
    container.register(CleanupService)

    const runner = new LifecycleRunner(container)
    await runner.runModuleDestroy([CleanupService])

    expect(destroyFn).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/core && bun test test/lifecycle-runner.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement LifecycleRunner**

Create `packages/core/src/lifecycle-runner.ts`:
```ts
import type { ClassConstructor, ProviderDef } from '@banhmi/common'
import type { Container } from './container'
import { isClassProvider } from './provider'

export class LifecycleRunner {
  constructor(private readonly container: Container) {}

  async runModuleInit(providers: ProviderDef[]): Promise<void> {
    for (const def of providers) {
      if (!isClassProvider(def)) continue
      const instance = this.container.resolve(def as ClassConstructor) as Record<string, unknown>
      if (typeof instance['onModuleInit'] === 'function') {
        await (instance['onModuleInit'] as () => Promise<void>)()
      }
    }
  }

  async runApplicationBootstrap(providers: ProviderDef[]): Promise<void> {
    for (const def of providers) {
      if (!isClassProvider(def)) continue
      const instance = this.container.resolve(def as ClassConstructor) as Record<string, unknown>
      if (typeof instance['onApplicationBootstrap'] === 'function') {
        await (instance['onApplicationBootstrap'] as () => Promise<void>)()
      }
    }
  }

  async runModuleDestroy(providers: ProviderDef[]): Promise<void> {
    for (const def of [...providers].reverse()) {
      if (!isClassProvider(def)) continue
      const instance = this.container.resolve(def as ClassConstructor) as Record<string, unknown>
      if (typeof instance['onModuleDestroy'] === 'function') {
        await (instance['onModuleDestroy'] as () => Promise<void>)()
      }
    }
  }

  async runApplicationShutdown(providers: ProviderDef[], signal?: string): Promise<void> {
    for (const def of [...providers].reverse()) {
      if (!isClassProvider(def)) continue
      const instance = this.container.resolve(def as ClassConstructor) as Record<string, unknown>
      if (typeof instance['onApplicationShutdown'] === 'function') {
        await (instance['onApplicationShutdown'] as (s?: string) => Promise<void>)(signal)
      }
    }
  }
}
```

- [ ] **Step 4: Implement BunnestApplication**

Create `packages/core/src/application.ts`:
```ts
import type { AbstractConstructor, ClassConstructor, ProviderDef } from '@banhmi/common'
import { Container } from './container'
import { LifecycleRunner } from './lifecycle-runner'
import type { ModuleNode } from './module-graph'

export interface HttpAdapter {
  registerController(instance: object, controllerClass: ClassConstructor): void
  listen(port: number): Promise<void>
  close(): Promise<void>
  use(middleware: unknown): void
}

export class BunnestApplication {
  private lifecycleRunner: LifecycleRunner
  private allProviders: ProviderDef[]
  private shutdownHooksEnabled = false

  constructor(
    readonly container: Container,
    readonly moduleTree: ModuleNode,
    readonly adapter: HttpAdapter,
  ) {
    this.lifecycleRunner = new LifecycleRunner(container)
    this.allProviders = this.flattenAll(moduleTree)
  }

  use(middleware: unknown): this {
    this.adapter.use(middleware)
    return this
  }

  enableShutdownHooks(): this {
    this.shutdownHooksEnabled = true
    return this
  }

  async listen(port: number): Promise<void> {
    await this.lifecycleRunner.runModuleInit(this.allProviders)

    for (const ctrl of this.moduleTree.controllers ?? []) {
      const instance = this.container.resolve(ctrl as ClassConstructor)
      this.adapter.registerController(instance as object, ctrl as ClassConstructor)
    }

    await this.adapter.listen(port)
    await this.lifecycleRunner.runApplicationBootstrap(this.allProviders)

    if (this.shutdownHooksEnabled) {
      for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.on(signal, async () => {
          await this.close(signal)
          process.exit(0)
        })
      }
    }
  }

  async close(signal?: string): Promise<void> {
    await this.lifecycleRunner.runModuleDestroy(this.allProviders)
    await this.adapter.close()
    await this.lifecycleRunner.runApplicationShutdown(this.allProviders, signal)
  }

  private flattenAll(node: ModuleNode): ProviderDef[] {
    const seen = new Set<AbstractConstructor>()
    const result: ProviderDef[] = []

    function walk(n: ModuleNode) {
      if (seen.has(n.module)) return
      seen.add(n.module)
      for (const imp of n.imports) walk(imp)
      result.push(...(n.providers ?? []))
      result.push(...(n.controllers ?? []))
    }

    walk(node)
    return result
  }
}
```

- [ ] **Step 5: Run all core tests**

```bash
cd packages/core && bun test
```

Expected: all passing

- [ ] **Step 6: Update core index**

Update `packages/core/src/index.ts`:
```ts
export { ModuleGraph } from './module-graph'
export type { ModuleNode } from './module-graph'
export { Container } from './container'
export { LifecycleRunner } from './lifecycle-runner'
export { BunnestApplication } from './application'
export type { HttpAdapter } from './application'
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat(@banhmi/core): add lifecycle runner and BunnestApplication"
```

---

### Task 11: @banhmi/platform-bun — Radix router

**Files:**
- Create: `packages/platform-bun/src/router.ts`
- Create: `packages/platform-bun/test/router.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/platform-bun/test/router.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { RadixRouter } from '../src/router'
import type { RouteCtx } from '@banhmi/common'

const noop = async (_ctx: RouteCtx) => new Response('ok')

describe('RadixRouter', () => {
  test('matches exact path', () => {
    const router = new RadixRouter()
    router.add({ method: 'GET', path: '/cats', handler: noop, guards: [], interceptors: [], filters: [], httpCode: undefined, responseHeaders: [] })

    const match = router.match('GET', '/cats')
    expect(match).not.toBeNull()
    expect(match?.params).toEqual({})
  })

  test('extracts single param', () => {
    const router = new RadixRouter()
    router.add({ method: 'GET', path: '/cats/:id', handler: noop, guards: [], interceptors: [], filters: [], httpCode: undefined, responseHeaders: [] })

    const match = router.match('GET', '/cats/123')
    expect(match?.params).toEqual({ id: '123' })
  })

  test('extracts multiple params', () => {
    const router = new RadixRouter()
    router.add({ method: 'GET', path: '/users/:uid/posts/:pid', handler: noop, guards: [], interceptors: [], filters: [], httpCode: undefined, responseHeaders: [] })

    const match = router.match('GET', '/users/42/posts/99')
    expect(match?.params).toEqual({ uid: '42', pid: '99' })
  })

  test('returns null for no match', () => {
    const router = new RadixRouter()
    expect(router.match('GET', '/nowhere')).toBeNull()
  })

  test('method discrimination', () => {
    const router = new RadixRouter()
    router.add({ method: 'GET', path: '/cats', handler: noop, guards: [], interceptors: [], filters: [], httpCode: undefined, responseHeaders: [] })
    router.add({ method: 'POST', path: '/cats', handler: noop, guards: [], interceptors: [], filters: [], httpCode: undefined, responseHeaders: [] })

    expect(router.match('GET', '/cats')).not.toBeNull()
    expect(router.match('POST', '/cats')).not.toBeNull()
    expect(router.match('DELETE', '/cats')).toBeNull()
  })

  test('does not match partial path', () => {
    const router = new RadixRouter()
    router.add({ method: 'GET', path: '/cats', handler: noop, guards: [], interceptors: [], filters: [], httpCode: undefined, responseHeaders: [] })

    expect(router.match('GET', '/cats/extra')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/platform-bun && bun test test/router.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement RadixRouter**

Create `packages/platform-bun/src/router.ts`:
```ts
import type { ExceptionFilter, Guard, HttpMethod, Interceptor, RouteCtx } from '@banhmi/common'
import type { ClassConstructor } from '@banhmi/common'

export interface RegisteredRoute {
  method: HttpMethod
  path: string
  handler: (ctx: RouteCtx) => Promise<unknown>
  guards: ClassConstructor[]
  interceptors: ClassConstructor[]
  filters: ClassConstructor[]
  httpCode: number | undefined
  responseHeaders: [string, string][]
  handlerClass?: ClassConstructor
  handlerName?: string
}

export interface MatchResult {
  handler: RegisteredRoute['handler']
  params: Record<string, string>
  guards: ClassConstructor[]
  interceptors: ClassConstructor[]
  filters: ClassConstructor[]
  httpCode: number | undefined
  responseHeaders: [string, string][]
  handlerClass?: ClassConstructor
  handlerName?: string
}

function buildMatcher(pattern: string): (pathname: string) => Record<string, string> | null {
  const paramNames: string[] = []
  const regexSource = pattern
    .replace(/:([^/]+\?)/g, (_match, name: string) => {
      paramNames.push(name.slice(0, -1))
      return '([^/]*)'
    })
    .replace(/:([^/]+)/g, (_match, name: string) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    .replace(/\*/g, '(.*)')

  const regex = new RegExp(`^${regexSource}$`)

  return (pathname: string) => {
    const match = pathname.match(regex)
    if (!match) return null
    const params: Record<string, string> = {}
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1] ?? ''
    })
    return params
  }
}

export class RadixRouter {
  private routes: Array<RegisteredRoute & { matcher: (p: string) => Record<string, string> | null }> = []

  add(route: RegisteredRoute): void {
    this.routes.push({ ...route, matcher: buildMatcher(route.path) })
  }

  match(method: string, pathname: string): MatchResult | null {
    for (const route of this.routes) {
      if (route.method !== method) continue
      const params = route.matcher(pathname)
      if (params !== null) {
        return {
          handler: route.handler,
          params,
          guards: route.guards,
          interceptors: route.interceptors,
          filters: route.filters,
          httpCode: route.httpCode,
          responseHeaders: route.responseHeaders,
          handlerClass: route.handlerClass,
          handlerName: route.handlerName,
        }
      }
    }
    return null
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd packages/platform-bun && bun test test/router.test.ts
```

Expected: 6 passing

- [ ] **Step 5: Commit**

```bash
git add packages/platform-bun/src/router.ts packages/platform-bun/test/router.test.ts
git commit -m "feat(@banhmi/platform-bun): add RadixRouter with param extraction"
```

---

### Task 12: @banhmi/platform-bun — BunRouteCtx & BunExecutionContext

**Files:**
- Create: `packages/platform-bun/src/route-ctx.ts`
- Create: `packages/platform-bun/src/execution-context.ts`
- Create: `packages/platform-bun/test/route-ctx.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/platform-bun/test/route-ctx.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { BunRouteCtx } from '../src/route-ctx'

describe('BunRouteCtx', () => {
  test('exposes request and params', () => {
    const req = new Request('https://example.com/cats/42')
    const ctx = new BunRouteCtx(req, { id: '42' })

    expect(ctx.request).toBe(req)
    expect(ctx.params).toEqual({ id: '42' })
  })

  test('parses query string', () => {
    const req = new Request('https://example.com/cats?limit=10&page=2')
    const ctx = new BunRouteCtx(req, {})

    expect(ctx.query.get('limit')).toBe('10')
    expect(ctx.query.get('page')).toBe('2')
  })

  test('exposes headers', () => {
    const req = new Request('https://example.com/', {
      headers: { 'content-type': 'application/json' },
    })
    const ctx = new BunRouteCtx(req, {})

    expect(ctx.headers.get('content-type')).toBe('application/json')
  })

  test('json() parses request body', async () => {
    const req = new Request('https://example.com/cats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Whiskers' }),
    })
    const ctx = new BunRouteCtx(req, {})

    const body = await ctx.json<{ name: string }>()
    expect(body.name).toBe('Whiskers')
  })

  test('text() returns raw body text', async () => {
    const req = new Request('https://example.com/', {
      method: 'POST',
      body: 'hello world',
    })
    const ctx = new BunRouteCtx(req, {})

    expect(await ctx.text()).toBe('hello world')
  })

  test('ip from X-Forwarded-For header', () => {
    const req = new Request('https://example.com/', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    const ctx = new BunRouteCtx(req, {})

    expect(ctx.ip).toBe('1.2.3.4')
  })

  test('ip falls back to "unknown"', () => {
    const req = new Request('https://example.com/')
    const ctx = new BunRouteCtx(req, {})

    expect(ctx.ip).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/platform-bun && bun test test/route-ctx.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement BunRouteCtx**

Create `packages/platform-bun/src/route-ctx.ts`:
```ts
import type { RouteCtx } from '@banhmi/common'

export class BunRouteCtx implements RouteCtx {
  constructor(
    readonly request: Request,
    readonly params: Readonly<Record<string, string>>,
  ) {}

  get query(): URLSearchParams {
    return new URL(this.request.url).searchParams
  }

  get headers(): Headers {
    return this.request.headers
  }

  get ip(): string {
    return this.request.headers.get('x-forwarded-for') ?? 'unknown'
  }

  json<T = unknown>(): Promise<T> {
    return this.request.clone().json() as Promise<T>
  }

  text(): Promise<string> {
    return this.request.clone().text()
  }

  formData(): Promise<FormData> {
    return this.request.clone().formData()
  }
}
```

- [ ] **Step 4: Implement BunExecutionContext**

Create `packages/platform-bun/src/execution-context.ts`:
```ts
import type { ClassConstructor, ExecutionContext, RouteCtx } from '@banhmi/common'

export class BunExecutionContext implements ExecutionContext {
  constructor(
    private readonly ctx: RouteCtx,
    private readonly controllerClass: ClassConstructor,
    private readonly handlerFn: (...args: unknown[]) => unknown,
  ) {}

  getCtx(): RouteCtx {
    return this.ctx
  }

  getHandler(): (...args: unknown[]) => unknown {
    return this.handlerFn
  }

  getClass(): ClassConstructor {
    return this.controllerClass
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd packages/platform-bun && bun test test/route-ctx.test.ts
```

Expected: 7 passing

- [ ] **Step 6: Commit**

```bash
git add packages/platform-bun/src/route-ctx.ts packages/platform-bun/src/execution-context.ts packages/platform-bun/test/route-ctx.test.ts
git commit -m "feat(@banhmi/platform-bun): add BunRouteCtx and BunExecutionContext"
```

---

### Task 13: @banhmi/platform-bun — Global exception filter & enhancer pipeline

**Files:**
- Create: `packages/platform-bun/src/global-filter.ts`
- Create: `packages/platform-bun/src/enhancer-pipeline.ts`
- Create: `packages/platform-bun/test/enhancer-pipeline.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/platform-bun/test/enhancer-pipeline.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { runEnhancerPipeline } from '../src/enhancer-pipeline'
import { BunExecutionContext } from '../src/execution-context'
import { BunRouteCtx } from '../src/route-ctx'
import type { Guard, Interceptor, CallHandler, ExecutionContext, ExceptionFilter } from '@banhmi/common'
import { ForbiddenException, NotFoundException } from '@banhmi/common'

function makeCtx(url = 'https://example.com/') {
  const req = new Request(url)
  const routeCtx = new BunRouteCtx(req, {})
  return new BunExecutionContext(routeCtx, class {}, () => null)
}

describe('runEnhancerPipeline', () => {
  test('executes handler and returns Response', async () => {
    const handler = async () => Response.json({ ok: true })
    const res = await runEnhancerPipeline(makeCtx(), handler, [], [], [], 200, [])
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  test('serializes plain object to JSON response', async () => {
    const handler = async () => ({ name: 'Whiskers' })
    const res = await runEnhancerPipeline(makeCtx(), handler, [], [], [], 200, [])
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: 'Whiskers' })
  })

  test('guard rejection returns 403', async () => {
    const guard: Guard = { canActivate: async () => false }
    const handler = async () => Response.json({})
    const res = await runEnhancerPipeline(makeCtx(), handler, [guard], [], [], 200, [])
    expect(res.status).toBe(403)
  })

  test('interceptor wraps handler', async () => {
    const order: string[] = []

    const interceptor: Interceptor = {
      async intercept(_ctx: ExecutionContext, next: CallHandler): Promise<Response> {
        order.push('before')
        const res = await next.handle()
        order.push('after')
        return res
      },
    }

    const handler = async () => {
      order.push('handler')
      return Response.json({})
    }

    await runEnhancerPipeline(makeCtx(), handler, [], [interceptor], [], 200, [])
    expect(order).toEqual(['before', 'handler', 'after'])
  })

  test('exception filter catches typed exception', async () => {
    const filter: ExceptionFilter<NotFoundException> = {
      catch(ex: NotFoundException): Response {
        return Response.json({ caught: ex.message }, { status: 404 })
      },
    }

    const handler = async () => { throw new NotFoundException('cat not found') }
    const res = await runEnhancerPipeline(makeCtx(), handler, [], [], [{ filterInstance: filter, type: NotFoundException }], 200, [])
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ caught: 'cat not found' })
  })

  test('response headers are applied', async () => {
    const handler = async () => Response.json({})
    const res = await runEnhancerPipeline(makeCtx(), handler, [], [], [], 200, [['X-Custom', 'yes']])
    expect(res.headers.get('X-Custom')).toBe('yes')
  })

  test('httpCode overrides default status', async () => {
    const handler = async () => ({ id: 1 })
    const res = await runEnhancerPipeline(makeCtx(), handler, [], [], [], 201, [])
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/platform-bun && bun test test/enhancer-pipeline.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement GlobalExceptionFilter**

Create `packages/platform-bun/src/global-filter.ts`:
```ts
import type { ExceptionFilter, ExecutionContext } from '@banhmi/common'
import { HttpException } from '@banhmi/common'

export class GlobalExceptionFilter implements ExceptionFilter<unknown> {
  catch(exception: unknown, _context: ExecutionContext): Response {
    if (exception instanceof HttpException) {
      return Response.json(
        { statusCode: exception.statusCode, message: exception.message },
        { status: exception.statusCode },
      )
    }

    const isProduction = Bun.env['NODE_ENV'] === 'production'
    const message = isProduction ? 'Internal Server Error' : String(exception)

    return Response.json(
      { statusCode: 500, message },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Implement enhancer pipeline**

Create `packages/platform-bun/src/enhancer-pipeline.ts`:
```ts
import type { CallHandler, ExecutionContext, ExceptionFilter, Guard, Interceptor } from '@banhmi/common'
import { ForbiddenException } from '@banhmi/common'
import { GlobalExceptionFilter } from './global-filter'

export interface RegisteredFilter {
  filterInstance: ExceptionFilter<unknown>
  type?: new (...args: unknown[]) => unknown
}

function serializeResult(result: unknown, status: number, headers: [string, string][]): Response {
  let response: Response

  if (result instanceof Response) {
    response = result
  } else if (result === undefined || result === null) {
    response = new Response(null, { status: status === 200 ? 204 : status })
  } else {
    response = Response.json(result, { status })
  }

  if (headers.length === 0) return response

  const cloned = new Response(response.body, response)
  for (const [name, value] of headers) {
    cloned.headers.set(name, value)
  }
  return cloned
}

export async function runEnhancerPipeline(
  context: ExecutionContext,
  handler: () => Promise<unknown>,
  guards: Guard[],
  interceptors: Interceptor[],
  filters: RegisteredFilter[],
  httpCode: number,
  responseHeaders: [string, string][],
): Promise<Response> {
  try {
    // 1. Guards
    for (const guard of guards) {
      const allowed = await guard.canActivate(context)
      if (!allowed) throw new ForbiddenException()
    }

    // 2. Build interceptor chain around handler
    const baseHandler: CallHandler = { handle: handler as () => Promise<Response> }
    const chainedHandler = interceptors.reduceRight<CallHandler>(
      (next, interceptor) => ({
        handle: () => interceptor.intercept(context, next),
      }),
      baseHandler,
    )

    // 3. Execute
    const result = await chainedHandler.handle()
    return serializeResult(result, httpCode, responseHeaders)
  } catch (error) {
    // 4. Exception filters — route-level first, then global
    for (const { filterInstance, type } of filters) {
      if (!type || error instanceof type) {
        return filterInstance.catch(error, context)
      }
    }
    return new GlobalExceptionFilter().catch(error, context)
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd packages/platform-bun && bun test test/enhancer-pipeline.test.ts
```

Expected: 7 passing

- [ ] **Step 6: Commit**

```bash
git add packages/platform-bun/src/global-filter.ts packages/platform-bun/src/enhancer-pipeline.ts packages/platform-bun/test/enhancer-pipeline.test.ts
git commit -m "feat(@banhmi/platform-bun): add enhancer pipeline and GlobalExceptionFilter"
```

---

### Task 14: @banhmi/platform-bun — Route explorer

**Files:**
- Create: `packages/platform-bun/src/route-explorer.ts`
- Create: `packages/platform-bun/test/route-explorer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/platform-bun/test/route-explorer.test.ts`:
```ts
import { expect, test, describe } from 'bun:test'
import { RouteExplorer } from '../src/route-explorer'
import { Controller, Get, Post, HttpCode } from '@banhmi/common'
import type { RouteCtx } from '@banhmi/common'

describe('RouteExplorer', () => {
  test('extracts GET route', () => {
    @Controller('/cats')
    class CatsController {
      @Get('/:id')
      findOne(_ctx: RouteCtx) { return {} }
    }

    const instance = new CatsController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, CatsController)

    expect(routes).toHaveLength(1)
    expect(routes[0]?.method).toBe('GET')
    expect(routes[0]?.path).toBe('/cats/:id')
  })

  test('extracts multiple routes', () => {
    @Controller('/cats')
    class CatsController {
      @Get()
      findAll(_ctx: RouteCtx) { return [] }

      @Post()
      create(_ctx: RouteCtx) { return {} }
    }

    const instance = new CatsController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, CatsController)

    expect(routes).toHaveLength(2)
    const methods = routes.map((r) => r.method)
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
  })

  test('prefixes route path with controller prefix', () => {
    @Controller('/api/v1')
    class ApiController {
      @Get('/users')
      getUsers(_ctx: RouteCtx) { return [] }
    }

    const instance = new ApiController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, ApiController)

    expect(routes[0]?.path).toBe('/api/v1/users')
  })

  test('respects @HttpCode', () => {
    @Controller('/cats')
    class CatsController {
      @Post()
      @HttpCode(201)
      create(_ctx: RouteCtx) { return {} }
    }

    const instance = new CatsController()
    const explorer = new RouteExplorer()
    const routes = explorer.explore(instance, CatsController)

    expect(routes[0]?.httpCode).toBe(201)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd packages/platform-bun && bun test test/route-explorer.test.ts
```

Expected: module not found

- [ ] **Step 3: Implement RouteExplorer**

Create `packages/platform-bun/src/route-explorer.ts`:
```ts
import type { ClassConstructor, RouteCtx } from '@banhmi/common'
import {
  CONTROLLER_METADATA,
  FILTERS_METADATA,
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  INTERCEPTORS_METADATA,
  RESPONSE_HEADERS_METADATA,
  ROUTE_METADATA,
} from '@banhmi/common'
import type { ControllerMetadata } from '@banhmi/common'
import type { RouteDefinitionMeta } from '@banhmi/common'
import type { RegisteredRoute } from './router'

export class RouteExplorer {
  explore(instance: object, controllerClass: ClassConstructor): RegisteredRoute[] {
    const classMeta = controllerClass[Symbol.metadata] as Record<symbol, unknown> | null
    if (!classMeta) return []

    const controllerMeta = classMeta[CONTROLLER_METADATA] as ControllerMetadata | undefined
    if (!controllerMeta) return []

    const prefix = controllerMeta.prefix.replace(/\/$/, '')

    const routes = classMeta[ROUTE_METADATA] as Record<string, RouteDefinitionMeta> | undefined
    if (!routes) return []

    const classGuards = (classMeta[GUARDS_METADATA] as ClassConstructor[] | undefined) ?? []
    const classInterceptors = (classMeta[INTERCEPTORS_METADATA] as ClassConstructor[] | undefined) ?? []
    const classFilters = (classMeta[FILTERS_METADATA] as ClassConstructor[] | undefined) ?? []
    const httpCodes = (classMeta[HTTP_CODE_METADATA] as Record<string, number> | undefined) ?? {}
    const responseHeadersMap = (classMeta[RESPONSE_HEADERS_METADATA] as Record<string, [string, string][]> | undefined) ?? {}

    const registered: RegisteredRoute[] = []

    for (const [methodName, routeMeta] of Object.entries(routes)) {
      const routePath = routeMeta.path ? `${prefix}/${routeMeta.path.replace(/^\//, '')}` : prefix || '/'
      const normalizedPath = routePath.replace(/\/+/g, '/')

      const handlerFn = (instance as Record<string, unknown>)[methodName]
      if (typeof handlerFn !== 'function') continue

      const boundHandler = (ctx: RouteCtx) =>
        (handlerFn as (ctx: RouteCtx) => Promise<unknown>).call(instance, ctx)

      registered.push({
        method: routeMeta.method,
        path: normalizedPath,
        handler: boundHandler,
        guards: [...classGuards],
        interceptors: [...classInterceptors],
        filters: [...classFilters],
        httpCode: httpCodes[methodName],
        responseHeaders: responseHeadersMap[methodName] ?? [],
        handlerClass: controllerClass,
        handlerName: methodName,
      })
    }

    return registered
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd packages/platform-bun && bun test test/route-explorer.test.ts
```

Expected: 4 passing

- [ ] **Step 5: Commit**

```bash
git add packages/platform-bun/src/route-explorer.ts packages/platform-bun/test/route-explorer.test.ts
git commit -m "feat(@banhmi/platform-bun): add RouteExplorer for extracting controller routes"
```

---

### Task 15: @banhmi/platform-bun — BunAdapter & BunnestFactory

**Files:**
- Create: `packages/platform-bun/src/bun-adapter.ts`
- Create: `packages/platform-bun/src/factory.ts`
- Create: `packages/platform-bun/src/index.ts`

These are wiring files — tested via the integration test in Task 16.

- [ ] **Step 1: Implement BunAdapter**

Create `packages/platform-bun/src/bun-adapter.ts`:
```ts
import type { ClassConstructor } from '@banhmi/common'
import type { HttpAdapter } from '@banhmi/core'
import { BunExecutionContext } from './execution-context'
import { runEnhancerPipeline } from './enhancer-pipeline'
import type { RegisteredFilter } from './enhancer-pipeline'
import { RadixRouter } from './router'
import { BunRouteCtx } from './route-ctx'
import { RouteExplorer } from './route-explorer'
import { GlobalExceptionFilter } from './global-filter'
import type { Server } from 'bun'

type MiddlewareFn = (req: Request, next: () => Promise<Response>) => Promise<Response>

export class BunAdapter implements HttpAdapter {
  private router = new RadixRouter()
  private explorer = new RouteExplorer()
  private middleware: MiddlewareFn[] = []
  private server: Server | null = null

  use(middleware: unknown): void {
    this.middleware.push(middleware as MiddlewareFn)
  }

  registerController(instance: object, controllerClass: ClassConstructor): void {
    const routes = this.explorer.explore(instance, controllerClass)
    for (const route of routes) {
      this.router.add(route)
    }
  }

  async listen(port: number): Promise<void> {
    this.server = Bun.serve({
      port,
      fetch: (req) => this.handleRequest(req),
    })
  }

  async close(): Promise<void> {
    this.server?.stop()
    this.server = null
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const match = this.router.match(request.method, url.pathname)

    if (!match) {
      return Response.json(
        { statusCode: 404, message: 'Not Found', path: url.pathname },
        { status: 404 },
      )
    }

    const routeCtx = new BunRouteCtx(request, match.params)
    const execCtx = new BunExecutionContext(
      routeCtx,
      match.handlerClass ?? class {},
      match.handler,
    )

    const guardInstances = match.guards.map((G) => new G())
    const interceptorInstances = match.interceptors.map((I) => new I())
    const filterInstances: RegisteredFilter[] = match.filters.map((F) => ({
      filterInstance: new F() as RegisteredFilter['filterInstance'],
    }))

    const core = () =>
      runEnhancerPipeline(
        execCtx,
        () => match.handler(routeCtx),
        guardInstances,
        interceptorInstances,
        filterInstances,
        match.httpCode ?? 200,
        match.responseHeaders,
      )

    return this.runMiddleware(request, core)
  }

  private async runMiddleware(
    request: Request,
    final: () => Promise<Response>,
  ): Promise<Response> {
    const chain = [...this.middleware]

    const execute = (index: number): Promise<Response> => {
      if (index >= chain.length) return final()
      const fn = chain[index]!
      return fn(request, () => execute(index + 1))
    }

    return execute(0)
  }
}
```

- [ ] **Step 2: Implement BunnestFactory**

Create `packages/platform-bun/src/factory.ts`:
```ts
import type { AbstractConstructor } from '@banhmi/common'
import { Container, ModuleGraph, BunnestApplication } from '@banhmi/core'
import { BunAdapter } from './bun-adapter'

export class BunnestFactory {
  static async create(rootModule: AbstractConstructor): Promise<BunnestApplication> {
    const graph = new ModuleGraph()
    const moduleTree = graph.buildTree(rootModule)

    const container = new Container()
    const allProviders = graph.flattenProviders(moduleTree)
    for (const provider of allProviders) {
      container.register(provider)
    }

    const adapter = new BunAdapter()
    return new BunnestApplication(container, moduleTree, adapter)
  }
}
```

- [ ] **Step 3: Wire up platform-bun index**

Update `packages/platform-bun/src/index.ts`:
```ts
export { BunAdapter } from './bun-adapter'
export { BunnestFactory } from './factory'
export { BunRouteCtx } from './route-ctx'
export { BunExecutionContext } from './execution-context'
export { RadixRouter } from './router'
export { GlobalExceptionFilter } from './global-filter'
export { RouteExplorer } from './route-explorer'
```

- [ ] **Step 4: Update bunnest facade index**

Update `packages/bunnest/src/index.ts`:
```ts
export * from '@banhmi/common'
export * from '@banhmi/core'
export * from '@banhmi/platform-bun'
```

- [ ] **Step 5: Commit**

```bash
git add packages/platform-bun/src/bun-adapter.ts packages/platform-bun/src/factory.ts packages/platform-bun/src/index.ts packages/bunnest/src/index.ts
git commit -m "feat(@banhmi/platform-bun): add BunAdapter and BunnestFactory"
```

---

### Task 16: Integration test — full app end-to-end

**Files:**
- Create: `packages/platform-bun/test/integration.test.ts`

- [ ] **Step 1: Write the integration test**

Create `packages/platform-bun/test/integration.test.ts`:
```ts
import { expect, test, describe, beforeAll, afterAll } from 'bun:test'
import { BunnestFactory } from '../src/factory'
import { Controller, Get, Post, HttpCode, Module, Injectable, NotFoundException, Token } from '@banhmi/common'
import type { RouteCtx, Guard, ExecutionContext, Interceptor, CallHandler } from '@banhmi/common'
import type { BunnestApplication } from '@banhmi/core'

// ─── Domain ──────────────────────────────────────────────────────────────────

interface Cat {
  id: number
  name: string
}

const CATS_STORE_TOKEN = Token<Map<number, Cat>>('cats-store')

@Injectable()
class CatsService {
  static inject = [CATS_STORE_TOKEN] as const

  constructor(private store: Map<number, Cat>) {}

  findAll(): Cat[] {
    return [...this.store.values()]
  }

  findById(id: number): Cat {
    const cat = this.store.get(id)
    if (!cat) throw new NotFoundException(`Cat #${id} not found`)
    return cat
  }

  create(name: string): Cat {
    const id = this.store.size + 1
    const cat: Cat = { id, name }
    this.store.set(id, cat)
    return cat
  }
}

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('/cats')
class CatsController {
  static inject = [CatsService] as const

  constructor(private cats: CatsService) {}

  @Get()
  findAll(_ctx: RouteCtx): Cat[] {
    return this.cats.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx): Cat {
    return this.cats.findById(Number(ctx.params['id']))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx): Promise<Cat> {
    const { name } = await ctx.json<{ name: string }>()
    return this.cats.create(name)
  }
}

// ─── Module ──────────────────────────────────────────────────────────────────

@Module({
  controllers: [CatsController],
  providers: [
    CatsService,
    { provide: CATS_STORE_TOKEN, useValue: new Map<number, Cat>() },
  ],
})
class AppModule {}

// ─── Tests ───────────────────────────────────────────────────────────────────

let app: BunnestApplication
const PORT = 54321
const BASE = `http://localhost:${PORT}`

beforeAll(async () => {
  app = await BunnestFactory.create(AppModule)
  await app.listen(PORT)
})

afterAll(async () => {
  await app.close()
})

describe('GET /cats', () => {
  test('returns empty array initially', async () => {
    const res = await fetch(`${BASE}/cats`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

describe('POST /cats', () => {
  test('creates a cat and returns 201', async () => {
    const res = await fetch(`${BASE}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Whiskers' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as Cat
    expect(body.name).toBe('Whiskers')
    expect(body.id).toBe(1)
  })
})

describe('GET /cats/:id', () => {
  test('returns the cat by id', async () => {
    const res = await fetch(`${BASE}/cats/1`)
    expect(res.status).toBe(200)
    const body = await res.json() as Cat
    expect(body.name).toBe('Whiskers')
  })

  test('returns 404 for unknown cat', async () => {
    const res = await fetch(`${BASE}/cats/999`)
    expect(res.status).toBe(404)
    const body = await res.json() as { message: string }
    expect(body.message).toContain('not found')
  })
})

describe('404 handling', () => {
  test('unknown route returns 404', async () => {
    const res = await fetch(`${BASE}/unknown`)
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the integration test**

```bash
cd packages/platform-bun && bun test test/integration.test.ts
```

Expected: 6 passing

If any test fails, investigate the failure and fix the relevant source file before proceeding.

- [ ] **Step 3: Run the full test suite**

```bash
cd /path/to/bunnest && bun test --recursive
```

Expected: all tests across all packages passing with 0 failures

- [ ] **Step 4: Commit**

```bash
git add packages/platform-bun/test/integration.test.ts
git commit -m "test(@banhmi/platform-bun): add end-to-end integration test"
```

---

### Task 17: Examples & package wiring validation

**Files:**
- Create: `examples/cats-api/src/main.ts`
- Create: `examples/cats-api/src/app.module.ts`
- Create: `examples/cats-api/src/cats/cats.module.ts`
- Create: `examples/cats-api/src/cats/cats.controller.ts`
- Create: `examples/cats-api/src/cats/cats.service.ts`
- Create: `examples/cats-api/package.json`

- [ ] **Step 1: Create example app package**

Create `examples/cats-api/package.json`:
```json
{
  "name": "cats-api-example",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/main.ts"
  },
  "dependencies": {
    "banhmi": "workspace:*"
  }
}
```

- [ ] **Step 2: Create example app**

Create `examples/cats-api/src/cats/cats.service.ts`:
```ts
import { Injectable, NotFoundException } from 'banhmi'

interface Cat {
  id: number
  name: string
  age: number
}

@Injectable()
export class CatsService {
  static inject = [] as const

  private cats: Cat[] = []
  private nextId = 1

  findAll(): Cat[] {
    return this.cats
  }

  findById(id: number): Cat {
    const cat = this.cats.find((c) => c.id === id)
    if (!cat) throw new NotFoundException(`Cat #${id} not found`)
    return cat
  }

  create(name: string, age: number): Cat {
    const cat: Cat = { id: this.nextId++, name, age }
    this.cats.push(cat)
    return cat
  }
}
```

Create `examples/cats-api/src/cats/cats.controller.ts`:
```ts
import { Controller, Get, Post, Delete, HttpCode } from 'banhmi'
import type { RouteCtx } from 'banhmi'
import { CatsService } from './cats.service'

@Controller('/cats')
export class CatsController {
  static inject = [CatsService] as const

  constructor(private cats: CatsService) {}

  @Get()
  findAll(_ctx: RouteCtx) {
    return this.cats.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.cats.findById(Number(ctx.params['id']))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const { name, age } = await ctx.json<{ name: string; age: number }>()
    return this.cats.create(name, age)
  }

  @Delete('/:id')
  remove(ctx: RouteCtx) {
    return Response.json({ deleted: Number(ctx.params['id']) })
  }
}
```

Create `examples/cats-api/src/cats/cats.module.ts`:
```ts
import { Module } from 'banhmi'
import { CatsController } from './cats.controller'
import { CatsService } from './cats.service'

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
```

Create `examples/cats-api/src/app.module.ts`:
```ts
import { Module } from 'banhmi'
import { CatsModule } from './cats/cats.module'

@Module({
  imports: [CatsModule],
})
export class AppModule {}
```

Create `examples/cats-api/src/main.ts`:
```ts
import { BunnestFactory } from 'banhmi'
import { AppModule } from './app.module'

const app = await BunnestFactory.create(AppModule)
app.enableShutdownHooks()
await app.listen(3000)

console.log('🐰 Bunnest running on http://localhost:3000')
```

- [ ] **Step 3: Install example dependencies and verify it starts**

```bash
bun install
cd examples/cats-api && bun run src/main.ts &
sleep 1

# Test a request
curl http://localhost:3000/cats

# Stop the background server
kill %1
```

Expected: `[]` returned from the cats endpoint.

- [ ] **Step 4: Commit**

```bash
git add examples/
git commit -m "feat(examples): add cats-api example demonstrating full framework usage"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task(s) |
|---|---|
| Package structure | Task 1 |
| Token<T> | Task 2 |
| @Injectable | Task 3 |
| @Module + ModuleMetadata | Task 3 |
| Module graph (DAG, circular dep) | Task 9 |
| DI container (singleton, transient, value, factory) | Task 9 |
| @Controller + route decorators | Task 4 |
| RouteCtx (replaces param decorators) | Task 6, 12 |
| @HttpCode, @Header, @Redirect | Task 5 |
| @UseGuards, @UseInterceptors, @UseFilters | Task 5 |
| Guard interface + execution | Task 6, 13 |
| Interceptor + CallHandler (no RxJS) | Task 6, 13 |
| ExceptionFilter interface | Task 6, 13 |
| HttpException hierarchy | Task 7 |
| Built-in pipes | Task 8 |
| ValidationPipe (Standard Schema) | Task 8 |
| Lifecycle hooks (OnModuleInit etc.) | Task 6, 10 |
| BunnestApplication.listen/close | Task 10 |
| Shutdown hooks | Task 10 |
| Radix router | Task 11 |
| BunRouteCtx | Task 12 |
| Enhancer pipeline order | Task 13 |
| Global exception filter | Task 13 |
| Route explorer | Task 14 |
| BunAdapter + Bun.serve | Task 15 |
| BunnestFactory.create() | Task 15 |
| bunnest facade package | Task 15 |
| Integration test | Task 16 |
| Example app | Task 17 |

**No gaps found.**

### Known Intentional Simplifications (v1)

- **Module scoping**: Container is flat (all providers globally available). Module-scoped exports are deferred to v1.1.
- **Request-scoped providers**: Only singleton scope implemented. Request scope is deferred to v1.1.
- **`@Redirect` response**: The decorator stores metadata but `BunAdapter` does not yet read it. Add `REDIRECT_METADATA` handling to `RouteExplorer`/`BunAdapter` as a follow-up.
- **Guard/interceptor instantiation**: In `BunAdapter`, guards and interceptors are instantiated with `new G()` (no DI). Injecting them via the container is a v1.1 follow-up.
- **`@UseGuards` on methods**: The route explorer currently only reads class-level guards. Per-method guard merging from method metadata is a follow-up.
