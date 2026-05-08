# Wave 5 — OpenAPI Polish Design Specification

**Date:** 2026-05-09
**Status:** Approved
**Predecessor:** Wave 4 (`v0.7.0-canary.wave4`, 1072 tests)
**Successor:** Wave 6 (Patterns)

## 1. Scope

Polish the existing `@banhmi/swagger` package into a production-grade `@banhmi/openapi` offering:

1. Rename `@banhmi/swagger` → `@banhmi/openapi`. Keep a deprecated re-export shim under the old name for one minor cycle.
2. Bundle Scalar UI as the default renderer (Bun-native, no external CDN by default). Swagger UI becomes opt-in.
3. CLI plugin that infers `@ApiProperty`-equivalent metadata from class shapes (parity with NestJS CLI plugin's auto-annotation behaviour).
4. SDL export helper for consumption by Wave 7 (`@banhmi/graphql`).
5. Decorators polished and tested at parity with NestJS: `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiBody`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiCookieAuth`, `@ApiSecurity`, `@ApiExcludeEndpoint`, `@ApiExtraModels`, `@ApiHideProperty`, `@ApiProperty`.

## 2. Cross-cutting design decisions

### 2.1 Rename strategy

- Create `packages/openapi/` mirroring `packages/swagger/` content with updated package name (`@banhmi/openapi`).
- Keep `packages/swagger/` as a thin shim: `package.json` deps on `@banhmi/openapi`; `src/index.ts` re-exports everything; mark `"deprecated": "Use @banhmi/openapi instead"` in package.json.
- Update all internal references in `packages/banhmi/`, examples, docs to use `@banhmi/openapi`.

### 2.2 Scalar UI

`SwaggerModule.setup(path, app, document, { ui: 'scalar' })` (default) renders the [Scalar](https://scalar.com) HTML page. Scalar is a single self-contained HTML file pulling its assets via CDN by default; expose an option to serve assets locally.

`{ ui: 'swagger' }` falls back to Swagger UI.

### 2.3 CLI plugin

A small Bun plugin (loaded via `bunfig.toml` or `Bun.plugin`) that reads TS source files and injects `@ApiProperty()` decorators on class properties whose types can be inferred from the AST. This is a non-trivial transform; we ship a tighter scope:

- Infer property types from explicit `: Type` annotations (no inference for inferred-only types).
- Add `@ApiProperty({ type: String })`, `@ApiProperty({ type: 'number' })`, etc.
- Skip already-decorated properties.

The transform runs at TS-compile / Bun-run time. For tests we provide a pure function `transformSource(code: string): string` that's testable without a compiler instance.

### 2.4 SDL export

`generateSdl(modelClasses)` walks `Symbol.metadata` from a list of model classes and produces a GraphQL SDL string. Used by Wave 7 to lift OpenAPI-decorated models into GraphQL schemas.

## 3. Acceptance criteria

- All existing `@banhmi/swagger` tests still pass against `@banhmi/openapi` (renamed).
- Scalar UI renders correctly when set up with a DocumentBuilder spec.
- CLI plugin transforms a sample DTO file as expected (unit-tested via `transformSource`).
- SDL exporter produces valid GraphQL for a sample DTO.
- Existing examples that used `@banhmi/swagger` continue to work via the shim; new code uses `@banhmi/openapi` directly.

## 4. Verification gate

Standard. Tag `v0.8.0-canary.wave5`.

## 5. Out of scope

- Auto-generation of TypeScript clients from spec.
- Federation across multiple OpenAPI specs.
- AsyncAPI (deferred to Wave 8 microservices if relevant).
