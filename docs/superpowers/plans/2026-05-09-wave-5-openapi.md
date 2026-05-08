# Wave 5 — OpenAPI Polish Implementation Plan

**Goal:** Rename swagger→openapi, bundle Scalar UI, CLI plugin, SDL export.

**Tasks:**

1. Rename `@banhmi/swagger` → `@banhmi/openapi` with deprecated shim.
2. Add Scalar UI as default renderer.
3. Polish decorators (parity with NestJS' set).
4. CLI plugin for auto-`@ApiProperty` inference.
5. SDL export helper.
6. Examples + docs + tests.
7. Verification gate + canary tag.

---

## Task 1 — Rename + shim

Steps:

1. Copy `packages/swagger/` → `packages/openapi/`.
2. Update `packages/openapi/package.json` `"name"` to `@banhmi/openapi`.
3. Update internal `@banhmi/swagger` references (none expected unless tests do this) → `@banhmi/openapi`.
4. Replace `packages/swagger/src/index.ts` with `export * from '@banhmi/openapi'`.
5. Replace `packages/swagger/package.json`:
   ```json
   { "name": "@banhmi/swagger", "version": "0.0.2", "deprecated": "Use @banhmi/openapi", "dependencies": { "@banhmi/openapi": "workspace:*" } }
   ```
6. Update `packages/banhmi/package.json` deps + `packages/banhmi/src/index.ts` re-exports to use `@banhmi/openapi`.
7. Run `bun install`; `bun test packages/openapi packages/swagger`. Both should pass.

Commit: `feat(openapi): rename @banhmi/swagger to @banhmi/openapi with deprecated shim`

---

## Task 2 — Scalar UI

Add `src/ui/scalar.ts` to `packages/openapi/`:

```ts
export function renderScalarHtml(specUrl: string, opts?: { theme?: string; servers?: string[] }): string
```

Returns a complete HTML page that loads Scalar API Reference from the CDN (`https://cdn.jsdelivr.net/npm/@scalar/api-reference`) pointing at `specUrl`.

Update `SwaggerModule.setup(path, app, doc, opts)` to accept `{ ui: 'scalar' | 'swagger' }` (default `'scalar'`). When `ui` is `scalar`, mount the Scalar HTML; when `swagger`, mount the existing Swagger UI HTML.

Add tests:
- `renderScalarHtml('/openapi.json')` returns a string containing `<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"`.
- Setup with `{ ui: 'scalar' }` mounts a route that returns Scalar HTML.
- Setup with `{ ui: 'swagger' }` mounts Swagger UI HTML.

Commit: `feat(openapi): bundle Scalar UI as default renderer with Swagger UI opt-in`

---

## Task 3 — Decorator polish

Audit `packages/openapi/src/` for the existing decorator set. Add any missing from this list:

- `@ApiTags(...names)` — controller tagging
- `@ApiOperation({ summary, description, deprecated })` — handler description
- `@ApiParam({ name, type, description, required })` — path parameter
- `@ApiQuery({ name, type, description, required })` — query parameter
- `@ApiBody({ type, description, required })` — request body
- `@ApiResponse({ status, description, type, schema })` — response schema
- `@ApiBearerAuth(name?)` / `@ApiCookieAuth(name?)` / `@ApiSecurity(name)` — security
- `@ApiExcludeEndpoint()` — hide handler
- `@ApiExtraModels(...classes)` — register additional models
- `@ApiHideProperty()` — hide a property
- `@ApiProperty({ type, description, example, required })` — class property metadata

For each missing decorator, add tests asserting metadata is written via `Symbol.metadata`. Update `Explorer` (or whatever walks decorators to build the OpenAPI doc) to consume the new metadata.

Commit: `feat(openapi): full decorator parity with NestJS @nestjs/swagger`

---

## Task 4 — CLI plugin

Add `packages/openapi/cli/`:

```
packages/openapi/cli/
  src/transform.ts            # transformSource(code: string): string
  src/plugin.ts               # Bun plugin entry point
  test/transform.test.ts
```

`transform.ts`:

```ts
/**
 * Transform a TS source file by adding `@ApiProperty()` decorators to class
 * properties whose types can be inferred from explicit `: Type` annotations.
 *
 * @example
 * transformSource(`class A { name: string }`) // adds @ApiProperty()
 */
export function transformSource(code: string): string
```

For Wave 5 keep this conservative: parse with a small regex + line-walker (no full TS AST). Look for `class X { [decorators-already-present?] propName: Type }` patterns; insert `@ApiProperty()` if none of `@ApiProperty`, `@ApiHideProperty`, `@Exclude` is already there.

Test cases:
- Adds `@ApiProperty()` to `name: string`.
- Skips already-decorated properties.
- Skips `private` and `public` keyword properties only when they have no body modifier (be careful; for safety, skip all `private` props).

The Bun plugin entry registers via `Bun.plugin({...})` so users can opt in via `bunfig.toml`'s `preload` or `Bun.plugin()`.

Update `packages/openapi/package.json` `exports`:

```json
"exports": {
  ".": "./src/index.ts",
  "./cli": "./cli/src/plugin.ts"
}
```

Tests:
- `transformSource('class A { name: string }')` contains `@ApiProperty()`.
- `transformSource('class A { @ApiProperty() name: string }')` is unchanged.
- `transformSource('class A { @Exclude() name: string }')` is unchanged.

Commit: `feat(openapi): add CLI plugin for @ApiProperty auto-inference`

---

## Task 5 — SDL export

Add `src/sdl.ts`:

```ts
/**
 * Generate a GraphQL SDL fragment from a list of OpenAPI-decorated model classes.
 *
 * @example
 * generateSdl([User, Post])  // returns 'type User { ... } type Post { ... }'
 */
export function generateSdl(models: Function[]): string
```

Walks each model's `Symbol.metadata` looking for `@ApiProperty` data. Maps OpenAPI types to GraphQL types (string → String, number → Float or Int based on description, boolean → Boolean, array → list, object → Type reference).

Tests:
- `generateSdl([UserModel])` produces `type User { id: ID! name: String! }` for a class with two properties.
- Optional vs required mapping works.
- Nested type references work (`type Post { author: User! }`).

Commit: `feat(openapi): add SDL export helper for cross-pollination with @banhmi/graphql`

---

## Task 6 — Examples + docs

- Replace placeholders at `apps/docs/apps/web/src/content/openapi/{introduction,scalar,types-and-parameters,operations,security,mapped-types,decorators,cli-plugin,other-features}.mdx`.
- Add `examples/features/openapi-scalar/` and `examples/features/openapi-swagger-ui/` with passing tests.
- Update existing `examples/cats-api/` to demonstrate `@ApiTags`, `@ApiOperation`, `@ApiResponse` in addition to its current setup.

Commit: `feat(openapi): add Scalar/Swagger micro-examples and docs polish`

---

## Task 7 — Wave verification gate

Standard. Tag `v0.8.0-canary.wave5`. Summary at `docs/superpowers/specs/2026-05-09-wave-5-summary.md`.
