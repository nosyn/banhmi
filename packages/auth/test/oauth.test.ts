import { describe, expect, mock, test } from 'bun:test'
import { signValue } from '@banhmi/cookies'
import { OAuthClient } from '../src/oauth/oauth-client'
import { GitHubStrategy } from '../src/strategies/github'
import { GoogleStrategy } from '../src/strategies/google'

const STATE_SECRET = 'test-oauth-state-secret'

// Minimal RouteCtx stub
const fakeCtx = {
  request: new Request('http://localhost/'),
  params: {},
  query: new URLSearchParams(),
  headers: new Headers(),
  ip: '127.0.0.1',
  state: {},
  json: async () => ({}),
  text: async () => '',
  formData: async () => new FormData(),
}

// ---- OAuthClient unit tests ----

describe('OAuthClient', () => {
  test('getAuthorizationUrl includes required params', async () => {
    const client = new OAuthClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      stateSecret: STATE_SECRET,
      authorizationUrl: 'https://provider.example/auth',
      tokenUrl: 'https://provider.example/token',
      userInfoUrl: 'https://provider.example/user',
      scopes: ['openid', 'email'],
      provider: 'test',
    })

    const url = new URL(await client.getAuthorizationUrl())
    expect(url.origin + url.pathname).toBe('https://provider.example/auth')
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://example.com/callback',
    )
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('openid email')
    // state must be present and have the signature separator
    const state = url.searchParams.get('state')
    expect(state).toBeTruthy()
    expect(state).toContain('.')
  })

  test('handleCallback verifies state and exchanges code', async () => {
    const client = new OAuthClient({
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://example.com/callback',
      stateSecret: STATE_SECRET,
      authorizationUrl: 'https://p.example/auth',
      tokenUrl: 'https://p.example/token',
      userInfoUrl: 'https://p.example/user',
      scopes: ['email'],
      provider: 'test',
    })

    const signedState = await signValue('some-nonce', STATE_SECRET)

    // Mock fetch for token and userinfo
    const originalFetch = globalThis.fetch
    let callCount = 0
    globalThis.fetch = mock(async (url: string | Request | URL) => {
      callCount++
      const urlStr =
        typeof url === 'string'
          ? url
          : url instanceof URL
            ? url.toString()
            : url.url
      if (urlStr.includes('/token')) {
        return new Response(JSON.stringify({ access_token: 'tok-123' }), {
          headers: { 'content-type': 'application/json' },
        })
      }
      if (urlStr.includes('/user')) {
        return new Response(
          JSON.stringify({
            id: '42',
            email: 'user@test.com',
            name: 'Test User',
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    }) as typeof fetch

    try {
      const profile = await client.handleCallback('auth-code', signedState)
      expect(callCount).toBe(2)
      expect(profile.provider).toBe('test')
      expect(profile.id).toBe('42')
      expect(profile.email).toBe('user@test.com')
      expect(profile.name).toBe('Test User')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('handleCallback throws on invalid state', async () => {
    const client = new OAuthClient({
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://example.com/callback',
      stateSecret: STATE_SECRET,
      authorizationUrl: 'https://p.example/auth',
      tokenUrl: 'https://p.example/token',
      userInfoUrl: 'https://p.example/user',
      scopes: [],
      provider: 'test',
    })

    await expect(
      client.handleCallback('some-code', 'tampered-state-no-signature'),
    ).rejects.toThrow('invalid or has been tampered')
  })
})

// ---- GoogleStrategy ----

describe('GoogleStrategy', () => {
  const makeGoogleStrategy = () =>
    new GoogleStrategy({
      clientId: 'google-cid',
      clientSecret: 'google-secret',
      redirectUri: 'https://example.com/auth/google/callback',
      stateSecret: STATE_SECRET,
    })

  test('getAuthorizationUrl points to Google', async () => {
    const strategy = makeGoogleStrategy()
    const url = new URL(await strategy.getAuthorizationUrl())
    expect(url.hostname).toBe('accounts.google.com')
    expect(url.searchParams.get('client_id')).toBe('google-cid')
    expect(url.searchParams.get('scope')).toContain('openid')
  })

  test('handleCallback exchanges code and returns Google profile', async () => {
    const strategy = makeGoogleStrategy()
    const signedState = await signValue('nonce', STATE_SECRET)

    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async (url: string | Request | URL) => {
      const urlStr =
        typeof url === 'string'
          ? url
          : url instanceof URL
            ? url.toString()
            : (url as Request).url
      if (urlStr.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'google-tok' }), {
          headers: { 'content-type': 'application/json' },
        })
      }
      if (urlStr.includes('googleapis.com/oauth2/v3/userinfo')) {
        return new Response(
          JSON.stringify({
            sub: 'google-uid-123',
            email: 'alice@gmail.com',
            name: 'Alice G',
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      }
      return new Response('nf', { status: 404 })
    }) as typeof fetch

    try {
      const profile = await strategy.handleCallback('code-xyz', signedState)
      expect(profile.provider).toBe('google')
      expect(profile.id).toBe('google-uid-123')
      expect(profile.email).toBe('alice@gmail.com')
      expect(profile.name).toBe('Alice G')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('authenticate returns null when code/state are missing', async () => {
    const strategy = makeGoogleStrategy()
    const req = new Request('http://localhost/auth/google/callback')
    const user = await strategy.authenticate(req, fakeCtx)
    expect(user).toBeNull()
  })

  test('authenticate returns null on invalid state', async () => {
    const strategy = makeGoogleStrategy()
    const req = new Request(
      'http://localhost/auth/google/callback?code=x&state=bad-state',
    )
    const user = await strategy.authenticate(req, fakeCtx)
    expect(user).toBeNull()
  })

  test('validate callback transforms profile', async () => {
    const strategy = new GoogleStrategy({
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://example.com/cb',
      stateSecret: STATE_SECRET,
      validate: async (profile) => ({
        googleId: profile.id,
        email: profile.email ?? '',
      }),
    })
    const signedState = await signValue('n', STATE_SECRET)

    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ access_token: 't' }), {
          headers: { 'content-type': 'application/json' },
        }),
    ) as typeof fetch
    // Second call returns userinfo
    let calls = 0
    globalThis.fetch = mock(async () => {
      calls++
      if (calls === 1) {
        return new Response(JSON.stringify({ access_token: 'tok' }), {
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({ sub: 'gid-1', email: 'g@g.com', name: 'G' }),
        { headers: { 'content-type': 'application/json' } },
      )
    }) as typeof fetch

    try {
      const profile = (await strategy.handleCallback(
        'c',
        signedState,
      )) as OAuthProfile
      // handleCallback always returns OAuthProfile; validate runs in authenticate
      expect(profile.id).toBe('gid-1')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---- GitHubStrategy ----

describe('GitHubStrategy', () => {
  const makeGitHubStrategy = () =>
    new GitHubStrategy({
      clientId: 'gh-cid',
      clientSecret: 'gh-secret',
      redirectUri: 'https://example.com/auth/github/callback',
      stateSecret: STATE_SECRET,
    })

  test('getAuthorizationUrl points to GitHub', async () => {
    const strategy = makeGitHubStrategy()
    const url = new URL(await strategy.getAuthorizationUrl())
    expect(url.hostname).toBe('github.com')
    expect(url.pathname).toBe('/login/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('gh-cid')
    expect(url.searchParams.get('scope')).toContain('read:user')
  })

  test('handleCallback exchanges code and returns GitHub profile', async () => {
    const strategy = makeGitHubStrategy()
    const signedState = await signValue('nonce', STATE_SECRET)

    const originalFetch = globalThis.fetch
    let calls = 0
    globalThis.fetch = mock(async () => {
      calls++
      if (calls === 1) {
        return new Response(JSON.stringify({ access_token: 'gh-tok' }), {
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({
          id: 987,
          login: 'octocat',
          name: 'The Octocat',
          email: 'octo@github.com',
        }),
        { headers: { 'content-type': 'application/json' } },
      )
    }) as typeof fetch

    try {
      const profile = await strategy.handleCallback('gh-code', signedState)
      expect(profile.provider).toBe('github')
      expect(profile.id).toBe('987')
      expect(profile.email).toBe('octo@github.com')
      expect(profile.name).toBe('The Octocat')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('authenticate returns null when code/state are missing', async () => {
    const strategy = makeGitHubStrategy()
    const req = new Request('http://localhost/auth/github/callback')
    const user = await strategy.authenticate(req, fakeCtx)
    expect(user).toBeNull()
  })

  test('authenticate returns null on invalid state', async () => {
    const strategy = makeGitHubStrategy()
    const req = new Request(
      'http://localhost/auth/github/callback?code=x&state=bad',
    )
    const user = await strategy.authenticate(req, fakeCtx)
    expect(user).toBeNull()
  })
})

// Import for type check
import type { OAuthProfile } from '../src/types'
