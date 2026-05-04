# Banhmi — Agent Rules & Conventions

This file governs how AI agents work in this codebase. All agents MUST follow these rules.

---

## Project Overview

**Banhmi** is a Bun-first, NestJS-inspired TypeScript web framework. It uses:
- **TC39 Stage 3 decorators** (not legacy `experimentalDecorators`)
- **`Symbol.metadata`** for decorator metadata (via polyfill in `packages/common/src/polyfill-symbol-metadata.ts`)
- **Static `inject` DI** — `static inject = [DepClass, TOKEN] as const` (no reflect-metadata)
- **Raw `Bun.serve`** in `@banhmi/platform-bun` — zero external HTTP dependencies
- **Biome** for linting and formatting (not ESLint/Prettier)

### Workspace Layout

```
packages/
  common/          # @banhmi/common — decorators, interfaces, exceptions, pipes
  core/            # @banhmi/core — DI container, module graph, lifecycle, application
  platform-bun/    # @banhmi/platform-bun — BunAdapter, RadixRouter, BanhmiFactory
  banhmi/          # banhmi — re-exports all three packages
examples/
  cats-api/        # Demo app consuming the banhmi package
docs/
  superpowers/     # Design specs and implementation plans
```

---

## Code Conventions

### TypeScript

- **No `experimentalDecorators`** — use TC39 Stage 3 decorators only
- **`Symbol.metadata`** — read decorator metadata from `MyClass[Symbol.metadata][SYMBOL_KEY]`, never from `Reflect.metadata`
- **`import type`** — always use for pure type imports
- **No `!` non-null assertions** — extract to a variable or use nullish coalescing
- **No `any`** — use `unknown` and narrow
- Target: `ESNext`

### Decorator Metadata Pattern

```ts
// Writing (in decorator factory):
context.metadata[MY_SYMBOL] = value

// Reading (at runtime):
const meta = (MyClass[Symbol.metadata] ?? {})[MY_SYMBOL]
```

The polyfill that makes `Symbol.metadata` available is loaded via `bunfig.toml` preload in each package that needs it.

### Dependency Injection

```ts
// Class consumer:
static inject = [ServiceA, TOKEN_B] as const
constructor(private a: ServiceA, private b: TypeOfTokenB) {}

// Token definition (in common):
export const MY_TOKEN = Token<MyType>('MY_TOKEN')
```

Never use `@Inject()` decorator or `reflect-metadata`.

### Formatting (Biome)

- Single quotes
- No semicolons
- Trailing commas
- 2-space indent
- Alphabetical destructuring (Biome enforces)
- Run `bun run lint` before committing; run `bun run format` to auto-fix

---

## Testing

- **Bun test runner** — `bun test` (not Jest/Vitest)
- Test files: `*.test.ts` co-located under `test/` in each package
- Each package has its own `bunfig.toml` that preloads the `Symbol.metadata` polyfill
- Integration tests in `packages/platform-bun/test/integration.test.ts` spin up a real server on a random port
- Run all tests: `bun test --recursive` from repo root
- **TDD** — write failing test first, then implementation

---

## Package Naming

- Scoped packages: `@banhmi/common`, `@banhmi/core`, `@banhmi/platform-bun`
- Public package: `banhmi` (re-exports all three)
- Workspace refs: `"@banhmi/core": "workspace:*"` in package.json dependencies

---

## Adding a New Package

1. Create `packages/<name>/` with `package.json` (name: `@banhmi/<name>`, `"type": "module"`)
2. Add `bunfig.toml` with polyfill preload if using decorators
3. Add `tsconfig.json` extending root
4. Export from `packages/banhmi/src/index.ts`
5. Add as dependency in `packages/banhmi/package.json`

---

## Commit Style

Conventional commits:
```
feat: add WebSocket support
fix: resolve circular dep in container
chore: update biome to 1.9.1
docs: add roadmap
```

---

## What NOT to Do

- Do NOT use `reflect-metadata` or `emitDecoratorMetadata`
- Do NOT use Express, Fastify, or any HTTP framework — use raw `Bun.serve`
- Do NOT add runtime dependencies without discussion — keep deps minimal
- Do NOT use ESLint or Prettier — Biome only
- Do NOT use `process.env` directly in platform code — use `Bun.env`
- Do NOT skip the polyfill preload when adding a new package that uses decorators
- Do NOT create `README.md` or doc files unless explicitly asked
