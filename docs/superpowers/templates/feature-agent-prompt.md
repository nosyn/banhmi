# Feature Implementation Agent Prompt

> Used by the master orchestrator to dispatch a Claude agent for a single feature.

## Context

Replace `<REPO_ROOT>` with the absolute path to the repo before dispatching.

- Repository: `<REPO_ROOT>`
- Wave spec: `<WAVE_SPEC_PATH>`
- Wave plan: `<WAVE_PLAN_PATH>`
- Package skeleton: `<PACKAGE_PATH>`
- NestJS reference URL: `<NESTJS_DOC_URL>`
- Example template directory: `examples/features/.template/`
- Feature slug: `<FEATURE_SLUG>`
- Master spec: `docs/superpowers/specs/2026-05-08-banhmi-supremacy-master-design.md` (read Section 11.4 for the doc-page template).

## Task

Implement the feature listed in the wave plan under `### Feature: <FEATURE_SLUG>`. Concretely:

1. Implement the feature in `<PACKAGE_PATH>/src/`. Follow existing decorator/DI conventions in the repo (TC39 Stage 3, `Symbol.metadata`, `static inject`).
2. Write tests in `<PACKAGE_PATH>/test/`. Achieve ≥ 90% line coverage.
3. Create a micro-example at `examples/features/<FEATURE_SLUG>/`:
   - `index.ts`: single-file runnable demo
   - `feature.test.ts`: integration test
   - `README.md`: 1-paragraph description
   - `package.json`: workspace `banhmi` + `@banhmi/testing`
4. Author the doc page at `apps/docs/apps/web/src/content/<topic>/<FEATURE_SLUG>.mdx` using the standard template (see Section 11.4 of the master spec). Pull the code via `<CodeFromExample slug="<FEATURE_SLUG>" />`.
5. Add a benchmark scenario at `benchmarks/scenarios/<FEATURE_SLUG>/` if the feature has user-facing perf characteristics.

## Quality bars (enforced)

- `bun test` green for the package and the micro-example.
- `bun run lint` clean.
- `bun run quality` (`no-anys`, `no-bangs`, `no-reflect`, `tsdoc-coverage`) clean.
- TSDoc on every public symbol, with at least one `@example`.
- No `reflect-metadata`, no `experimentalDecorators`.
- No `process.env` in platform code (use `Bun.env`).

## Verification

Before reporting completion, run:

```bash
cd "<REPO_ROOT>"
bun test --recursive
bun run lint
bun run quality
bun run --cwd apps/docs/apps/web build
```

All four must succeed.

## Report

Reply with: a list of files added/changed, the test count and pass status, the lint/quality/docs:build status, and any deviations from the wave plan.
