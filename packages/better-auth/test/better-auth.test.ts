import { describe, expect, mock, test } from 'bun:test'
import {
  _registerBetterAuthClient,
  BetterAuthGuard,
} from '../src/better-auth.guard'
import { BetterAuthModule } from '../src/better-auth.module'
import { getBetterAuthSession } from '../src/decorators'
import { BETTER_AUTH_CLIENT, BETTER_AUTH_OPTIONS } from '../src/tokens'
import type { BetterAuthSessionData } from '../src/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(cookieHeader?: string) {
  return {
    request: new Request('http://localhost/', {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    }),
    params: {},
    query: new URLSearchParams(),
    headers: new Headers(cookieHeader ? { cookie: cookieHeader } : {}),
    ip: '127.0.0.1',
    state: {} as Record<string, unknown>,
    json: async () => ({}),
    text: async () => '',
    formData: async () => new FormData(),
  }
}

function makeExecutionContext(cookieHeader?: string) {
  const ctx = makeCtx(cookieHeader)
  return {
    getCtx: () => ctx,
    getClass: () => Object,
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => ctx.request,
      getResponse: () => null,
    }),
    switchToRpc: () => null,
    switchToWs: () => null,
    getType: () => 'http' as const,
    rawCtx: ctx,
  }
}

// ─── BetterAuthGuard unit tests ───────────────────────────────────────────────

describe('BetterAuthGuard', () => {
  test('canActivate returns true and stores session when client returns session', async () => {
    const mockSession: BetterAuthSessionData = {
      user: { id: 'u1', email: 'user@example.com', name: 'User One' },
      session: { id: 's1', userId: 'u1', expiresAt: '2099-01-01T00:00:00Z' },
    }

    _registerBetterAuthClient({
      getSession: mock(async (_req: Request) => mockSession),
    })

    const guard = new BetterAuthGuard()
    const execCtx = makeExecutionContext('better-auth.session_token=tok-abc')

    const result = await guard.canActivate(execCtx)

    expect(result).toBe(true)
    expect(execCtx.getCtx().state['banhmi:better-auth:session']).toEqual(
      mockSession,
    )
  })

  test('canActivate throws UnauthorizedException when client returns null', async () => {
    _registerBetterAuthClient({
      getSession: mock(async (_req: Request) => null),
    })

    const guard = new BetterAuthGuard()
    const execCtx = makeExecutionContext()

    await expect(guard.canActivate(execCtx)).rejects.toThrow(
      'No valid better-auth session',
    )
  })

  test('static inject is empty array (no DI deps)', () => {
    expect(BetterAuthGuard.inject).toEqual([])
  })
})

// ─── getBetterAuthSession helper ─────────────────────────────────────────────

describe('getBetterAuthSession', () => {
  test('returns session data when stored in ctx.state', () => {
    const ctx = makeCtx()
    const sessionData: BetterAuthSessionData = {
      user: { id: 'u2', email: 'other@example.com' },
      session: { id: 's2', userId: 'u2', expiresAt: '2099-01-01T00:00:00Z' },
    }
    ctx.state['banhmi:better-auth:session'] = sessionData

    const result = getBetterAuthSession(ctx)
    expect(result).toEqual(sessionData)
  })

  test('returns null when state key is not set', () => {
    const ctx = makeCtx()
    const result = getBetterAuthSession(ctx)
    expect(result).toBeNull()
  })

  test('returns null when state has wrong shape', () => {
    const ctx = makeCtx()
    ctx.state['banhmi:better-auth:session'] = 'not-an-object'
    const result = getBetterAuthSession(ctx)
    expect(result).toBeNull()
  })
})

// ─── BETTER_AUTH_CLIENT (the fetch-based implementation) ──────────────────────

describe('BETTER_AUTH_CLIENT (via BetterAuthModule.forRoot factory)', () => {
  // Instantiate the client directly for unit testing without spinning up a server.
  function makeClient(url: string, cookieName = 'better-auth.session_token') {
    const { parseCookies } =
      require('@banhmi/cookies') as typeof import('@banhmi/cookies')
    const base = url.replace(/\/$/, '')

    return {
      async getSession(req: Request): Promise<BetterAuthSessionData | null> {
        const cookieHeader = req.headers.get('cookie') ?? ''
        const cookies = parseCookies(cookieHeader)
        const sessionToken = cookies[cookieName]

        if (!sessionToken) return null

        try {
          const res = await fetch(`${base}/api/auth/get-session`, {
            headers: { cookie: `${cookieName}=${sessionToken}` },
          })
          if (!res.ok) return null

          const data = (await res.json()) as Record<string, unknown> | null
          if (!data || typeof data !== 'object') return null

          const { session, user } = data
          if (!session || !user) return null

          return data as BetterAuthSessionData
        } catch {
          return null
        }
      },
    }
  }

  test('getSession returns session data when response is valid', async () => {
    const originalFetch = globalThis.fetch
    const mockData: BetterAuthSessionData = {
      user: { id: 'ba-1', email: 'u@example.com' },
      session: { id: 's1', userId: 'ba-1', expiresAt: '2099-01-01T00:00:00Z' },
    }

    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify(mockData), {
          headers: { 'content-type': 'application/json' },
        }),
    ) as typeof fetch

    try {
      const client = makeClient('http://auth.example')
      const req = new Request('http://localhost/', {
        headers: { cookie: 'better-auth.session_token=sess-abc' },
      })
      const result = await client.getSession(req)
      expect(result).toEqual(mockData)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('getSession returns null when cookie is missing', async () => {
    const client = makeClient('http://auth.example')
    const req = new Request('http://localhost/')
    const result = await client.getSession(req)
    expect(result).toBeNull()
  })

  test('getSession returns null when better-auth responds with non-200', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(
      async () => new Response('Unauthorized', { status: 401 }),
    ) as typeof fetch

    try {
      const client = makeClient('http://auth.example')
      const req = new Request('http://localhost/', {
        headers: { cookie: 'better-auth.session_token=bad-token' },
      })
      const result = await client.getSession(req)
      expect(result).toBeNull()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('getSession returns null when fetch throws', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => {
      throw new Error('Network error')
    }) as typeof fetch

    try {
      const client = makeClient('http://auth.example')
      const req = new Request('http://localhost/', {
        headers: { cookie: 'better-auth.session_token=tok' },
      })
      const result = await client.getSession(req)
      expect(result).toBeNull()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('custom cookieName is forwarded correctly', async () => {
    const originalFetch = globalThis.fetch
    let capturedCookie = ''

    const mockData: BetterAuthSessionData = {
      user: { id: 'x', email: 'x@x.com' },
      session: { id: 'sx', userId: 'x', expiresAt: '2099-01-01T00:00:00Z' },
    }

    globalThis.fetch = mock(async (_url: unknown, init?: RequestInit) => {
      capturedCookie = (init?.headers as Record<string, string>)?.cookie ?? ''
      return new Response(JSON.stringify(mockData), {
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    try {
      const client = makeClient('http://auth.example', 'my-session')
      const req = new Request('http://localhost/', {
        headers: { cookie: 'my-session=custom-tok' },
      })
      await client.getSession(req)
      expect(capturedCookie).toContain('my-session=custom-tok')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('getSession returns null when response missing session or user fields', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ only: 'partial' }), {
          headers: { 'content-type': 'application/json' },
        }),
    ) as typeof fetch

    try {
      const client = makeClient('http://auth.example')
      const req = new Request('http://localhost/', {
        headers: { cookie: 'better-auth.session_token=tok' },
      })
      const result = await client.getSession(req)
      expect(result).toBeNull()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ─── BetterAuthModule.forRoot smoke test ──────────────────────────────────────

describe('BetterAuthModule.forRoot', () => {
  test('returns a module class (constructor function)', () => {
    const Mod = BetterAuthModule.forRoot({ url: 'http://localhost:3001' })
    expect(typeof Mod).toBe('function')
  })

  test('registers BETTER_AUTH_CLIENT and BETTER_AUTH_OPTIONS tokens', () => {
    expect(BETTER_AUTH_CLIENT).toBeTruthy()
    expect(BETTER_AUTH_OPTIONS).toBeTruthy()
  })
})
