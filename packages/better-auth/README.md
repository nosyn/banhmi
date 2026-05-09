# @banhmi/better-auth

Part of the [Banhmi](https://banhmi.dev) framework.

End-to-end [better-auth](https://better-auth.com) integration for Banhmi applications. This package lets better-auth own sessions, providers, and RBAC while Banhmi handles routing and DI.

## When to use this vs `@banhmi/auth`

| | `@banhmi/auth` | `@banhmi/better-auth` |
|---|---|---|
| Philosophy | Passport-style strategy composition | better-auth owns everything end-to-end |
| Session storage | Your choice (JWT, cookie, etc.) | better-auth (SQLite, Postgres, etc.) |
| Providers | Local, JWT, Google, GitHub | All better-auth providers (30+) |
| RBAC | Manual | better-auth organization/role plugin |
| Setup effort | Low (just import a strategy) | Medium (run better-auth server/middleware) |

Pick `@banhmi/auth` for custom credential flows or when you already have a JWT issuer. Pick `@banhmi/better-auth` when you want sessions, OAuth, magic links, and RBAC out of the box.

## Setup

```bash
bun add @banhmi/better-auth better-auth
```

## Usage

```ts
import { BetterAuthModule, BetterAuthGuard, getBetterAuthSession } from '@banhmi/better-auth'
import { Controller, Get, Module, UseGuards } from 'banhmi'
import type { RouteCtx } from 'banhmi'

@Controller('/users')
class UsersController {
  @Get('/me')
  @UseGuards(BetterAuthGuard)
  me(ctx: RouteCtx) {
    const session = getBetterAuthSession(ctx)
    return { user: session?.user }
  }

  @Get('/ping')
  ping() {
    return { ok: true }
  }
}

@Module({
  imports: [
    BetterAuthModule.forRoot({
      url: 'http://localhost:3001',          // URL of the better-auth instance
      cookieName: 'better-auth.session_token', // optional, this is the default
    }),
  ],
  controllers: [UsersController],
})
class AppModule {}
```

## Optional auth

For public endpoints that want to read the session when present:

```ts
@Get('/public')
async public(ctx: RouteCtx) {
  const session = getBetterAuthSession(ctx) // null if no session
  return { loggedIn: session !== null, user: session?.user ?? null }
}
```

## API reference

### `BetterAuthModule.forRoot(options)`

Registers the plugin. Provides `BETTER_AUTH_CLIENT`, `BETTER_AUTH_OPTIONS`, and `BetterAuthGuard` in the DI container.

### `BetterAuthGuard`

A `Guard` that reads the session cookie, calls the better-auth `get-session`
endpoint, and throws `401 Unauthorized` if no valid session is found. Stores
the session on `ctx.state['banhmi:better-auth:session']` on success.

### `getBetterAuthSession(ctx)`

Helper that reads the session from `ctx.state`. Returns `null` if the guard
has not run or the session is absent. Safe to call on public handlers.

### `BETTER_AUTH_CLIENT`

DI token for the thin session client:

```ts
interface BetterAuthClient {
  getSession(req: Request): Promise<BetterAuthSessionData | null>
}
```

## See also

- [`@banhmi/auth`](../auth) — strategy-based authentication (Local, JWT, OAuth)
- [better-auth docs](https://better-auth.com/docs)
