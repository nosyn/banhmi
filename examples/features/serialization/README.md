# serialization

Demonstrates `@banhmi/transform` — class-transformer parity using
`Symbol.metadata` with no external dependencies.

## What it shows

- `@Exclude()` drops a field from the serialised output.
- `@Expose({ name: '...' })` renames an output key.
- `@Expose({ groups: ['admin'] })` restricts a field to a specific group;
  it is omitted when `serialize()` is called without the matching group.
- Two `GET` endpoints showing the same user with/without the `admin` group.

## Run

```bash
bun test examples/features/serialization
```
