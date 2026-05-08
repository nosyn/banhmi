# Wave 1 Follow-up — Pre-existing `: any` Violations in `packages/common/`

**STATUS: RESOLVED in Wave 10, commit `83b9707`.**

Found by `bun run quality:no-anys` at the close of Wave 0 (commit `a4d6d648550e41170d2280cce7defa24c5b5128c`).

`quality:no-anys` is now CLEAN.

Each entry needs to be replaced with a typed alternative (`unknown` + narrowing, generics, or a concrete interface).

| File | Line | Snippet |
|---|---|---|
| `packages/common/src/interfaces/module-metadata.ts` | 4 | `export type ClassConstructor<T = unknown> = new (...args: any[]) => T` |
| `packages/common/src/interfaces/module-metadata.ts` | 7 | `...args: any[]` |
| `packages/common/src/decorators/websocket.ts` | 17 | `return <T extends abstract new (...args: any[]) => unknown>(` |
| `packages/common/src/decorators/module.ts` | 6 | `return <T extends abstract new (...args: any[]) => unknown>(` |
| `packages/common/src/decorators/controller.ts` | 9 | `return <T extends abstract new (...args: any[]) => unknown>(` |
| `packages/common/src/decorators/injectable.ts` | 5 | `return <T extends abstract new (...args: any[]) => unknown>(` |

## Notes

All 6 violations follow the same pattern: TC39 Stage 3 class decorator generic constraints use `abstract new (...args: any[]) => unknown` because TypeScript's class decorator context type requires `any` in the constructor args position to be assignable to the decorator target type constraint. Wave 1 should explore replacing with a typed helper type or using `unknown[]` if TypeScript's inference allows it.
