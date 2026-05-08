# Feature Template

Copy this directory to `examples/features/<your-slug>/` to start a new feature example.

- `index.ts` — single-file demo, importable by tests and rendered into MDX docs via `<CodeFromExample slug="<slug>" />`.
- `feature.test.ts` — integration test asserting behaviour.
- `package.json` — keep dependencies minimal; `banhmi` and `@banhmi/testing` cover most cases.

A feature is **not done** until both the demo and the test are committed and `bun test` is green.
