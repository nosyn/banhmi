# session example

Demonstrates `@banhmi/session` — server-side sessions with signed cookies and
a pluggable store (memory or Redis).

## Usage

```ts
import { Session, SessionModule, getSession } from '@banhmi/session'

@Controller()
class CounterController {
  @Get('/')
  @Session({ secret: 'my-secret' })
  async index(ctx: RouteCtx) {
    const s = getSession(ctx)
    const count = (s.get<number>('count') ?? 0) + 1
    s.set('count', count)
    return { count }
  }
}
```

## Run

```bash
bun test examples/features/session
```
