# Feature example: @banhmi/better-auth

Demonstrates `BetterAuthModule.forRoot()`, `BetterAuthGuard`, and
`getBetterAuthSession()`.

```bash
bun test
```

## What it shows

- `GET /me` — protected with `@UseGuards(BetterAuthGuard)`; returns 401 if no
  valid better-auth session cookie is present.
- `GET /ping` — public; always succeeds.

## See also

- [`@banhmi/better-auth`](../../../packages/better-auth)
- [better-auth-api example](../../better-auth-api) — full cluster app with better-auth
