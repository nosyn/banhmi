# Wave 5 — OpenAPI Polish Summary

**Predecessor:** Wave 4 (Data) — `v0.7.0-canary.wave4`
**Tag:** `v0.8.0-canary.wave5`

## Highlights

- Renamed `@banhmi/swagger` → `@banhmi/openapi`. The swagger package remains as a deprecated shim re-exporting `@banhmi/openapi`.
- Bundled Scalar UI as the default renderer; Swagger UI is opt-in via `{ ui: 'swagger' }`. JSON spec path changed from `/api-json` to `/api/openapi.json`.
- Filled out the decorator surface to NestJS parity: `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiBody`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiCookieAuth`, `@ApiSecurity`, `@ApiExcludeEndpoint`, `@ApiExtraModels`, `@ApiHideProperty`, `@ApiProperty`. All decorators write to `Symbol.metadata` under namespaced symbol keys.
- Updated `SwaggerExplorer` to consume all new metadata: tags, operation summary/description/deprecated, parameters (path + query), request body, response objects, security requirements, and excluded endpoints.
- CLI plugin (`@banhmi/openapi/cli`) auto-injects `@ApiProperty()` on undecorated typed class properties via a Bun file-loader hook. Conservative: skips private/static/readonly/abstract and already-decorated properties.
- Added `generateSdl(models)` SDL exporter for cross-pollination with the upcoming `@banhmi/graphql` (Wave 7).
- New micro-examples: `examples/features/openapi-scalar/`, `examples/features/openapi-swagger-ui/`.
- `examples/cats-api/` now demonstrates `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiBody`, `@ApiResponse`, and `@ApiProperty` on the Cat model.
- All 9 placeholder MDX pages under `apps/docs/apps/web/src/content/openapi/` filled with real content.

## Tests

**1126 pass, 41 skip (Redis/infra), 0 fail** across 176 files.
Wave 4 baseline: 1072. Wave 5 added 54 new tests (+5%).

## Known follow-ups

- Pre-existing 6 `: any` violations in `packages/common/` (ClassConstructor type definition). No new violations introduced in Wave 5.
- `@banhmi/swagger` shim remains available for one minor cycle; remove in v1.0.
- Mapped types (`PartialType`, `PickType`, `OmitType`) deferred to a future wave.
- SDL exporter uses simple type mapping; a future wave may integrate with `@banhmi/graphql` for richer schema generation.

## Verification gate

| Command | Result |
|---------|--------|
| `bun run lint` | PASS (0 errors, 0 warnings) |
| `bun test --recursive` | PASS (1126/1126, 41 skipped) |
| `bun run docs:build` | PASS (built in ~5.6s) |
| `bun run benchmarks:smoke` | SKIP (oha not installed — expected) |
| `bun run quality:no-bangs` | PASS |
| `bun run quality:no-reflect` | PASS |
| `bun run quality:tsdoc` | PASS |
| `bun run quality:no-anys` | 6 pre-existing violations in packages/common/ (no new ones) |
