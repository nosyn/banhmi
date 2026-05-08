# validation-zod

Demonstrates `@banhmi/validation` with the **Zod adapter** imported via the
`@banhmi/validation/zod` subpath export.

## What it shows

- `zod(schema)` wraps a Zod schema as a Banhmi `Validator<T>`.
- `AdaptedValidationPipe` turns validation failures into `ValidationException` (HTTP 400).
- The Zod package is an optional peer dependency — the subpath import keeps it
  out of the main bundle for users who don't need it.

## Run

```bash
bun test examples/features/validation-zod
```
