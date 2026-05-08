# validation-native

Demonstrates `@banhmi/validation` with the built-in **native adapter** — no external dependencies required.

## What it shows

- `native(spec)` builds a `Validator<T>` from a declarative spec.
- `AdaptedValidationPipe` wraps any `Validator<T>` and throws a `ValidationException` (HTTP 400) on failure.
- Structured per-field errors are included in the 400 response body.

## Run

```bash
bun test examples/features/validation-native
```
