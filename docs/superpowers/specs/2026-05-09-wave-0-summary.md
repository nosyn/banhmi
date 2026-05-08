# Wave 0 — Summary

Foundation shipped. Highlights:

- 4 quality scripts (`no-anys`, `no-bangs`, `no-reflect`, `tsdoc-coverage`) with TDD coverage.
- `examples/features/.template/` reference structure.
- Codex coordination harness (`scripts/codex/queue.ts`).
- `docs/superpowers/templates/feature-agent-prompt.md` agent prompt.
- ROADMAP updated to include Microservices + GraphQL.
- `benchmarks/` workspace + `oha` runner + 3 hello-world competitors (Banhmi, NestJS@Express, NestJS@Fastify) + smoke runner.
- MDX wired into the docs Vite app + `<CodeFromExample />` MDX component.
- 162 doc routes scaffolded from IA config; sidebar refactored to consume the same JSON.
- Root scripts: `quality`, `docs:build`, `docs:dev`, `benchmarks:smoke`.
- CI: Bun matrix (latest + canary), docs build job, benchmark smoke job.
- Known follow-up: 6 pre-existing `: any` violations in `packages/common/` (see `2026-05-09-wave-0-anys-followup.md`).

Verification gate green at 2026-05-09 / 71aaed867544c93fa271cd1766ad464d4b08e44f.
