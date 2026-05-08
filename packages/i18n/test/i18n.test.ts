import { expect, test } from 'bun:test'
import { I18nService } from '../src/i18n.service'
import { CookieResolver } from '../src/resolvers/cookie'
import { HeaderResolver } from '../src/resolvers/header'
import { QueryResolver } from '../src/resolvers/query'
import type { I18nOptions, LocaleResolver } from '../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(opts: {
  headers?: Record<string, string>
  query?: Record<string, string>
}) {
  const search = new URLSearchParams(opts.query ?? {})
  return {
    state: {} as Record<string, unknown>,
    params: {} as Record<string, string>,
    headers: new Headers(opts.headers ?? {}),
    query: search,
    ip: '127.0.0.1',
    json: async () => ({}),
    text: async () => '',
    formData: async () => new FormData(),
    request: new Request(`http://localhost/?${search.toString()}`),
  }
}

function makeService(opts: Partial<I18nOptions> = {}): I18nService {
  const defaults: I18nOptions = {
    fallbackLocale: 'en',
    resolvers: [],
    translations: {
      en: {
        greeting: 'Hello, {name}!',
        errors: {
          notFound: 'Not found',
        },
      },
      fr: {
        greeting: 'Bonjour, {name}!',
        errors: {
          notFound: 'Page introuvable',
        },
      },
    },
  }
  return new I18nService({ ...defaults, ...opts })
}

// ---------------------------------------------------------------------------
// Unit: I18nService.t
// ---------------------------------------------------------------------------

test('i18n: t with interpolation returns translated string', () => {
  const svc = makeService()
  const result = svc.t('greeting', { name: 'world' }, 'en')
  expect(result).toBe('Hello, world!')
})

test('i18n: t with french locale returns french translation', () => {
  const svc = makeService()
  const result = svc.t('greeting', { name: 'monde' }, 'fr')
  expect(result).toBe('Bonjour, monde!')
})

test('i18n: t missing key returns the key itself', () => {
  const svc = makeService()
  const result = svc.t('nonexistent.key', {}, 'en')
  expect(result).toBe('nonexistent.key')
})

test('i18n: t nested key resolves dot-path', () => {
  const svc = makeService()
  const result = svc.t('errors.notFound', {}, 'en')
  expect(result).toBe('Not found')
})

test('i18n: t missing interpolation variable leaves placeholder', () => {
  const svc = makeService()
  const result = svc.t('greeting', {}, 'en')
  expect(result).toBe('Hello, {name}!')
})

test('i18n: t falls back to fallbackLocale when locale not found', () => {
  const svc = makeService()
  const result = svc.t('greeting', { name: 'world' }, 'es') // no Spanish translations
  expect(result).toBe('Hello, world!')
})

// ---------------------------------------------------------------------------
// Locale resolution
// ---------------------------------------------------------------------------

test('HeaderResolver: resolves locale from Accept-Language header', () => {
  const ctx = makeCtx({
    headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' },
  })
  const locale = HeaderResolver.resolve(ctx)
  expect(locale).toBe('fr-FR')
})

test('HeaderResolver: returns null when header absent', () => {
  const ctx = makeCtx({})
  const locale = HeaderResolver.resolve(ctx)
  expect(locale).toBeNull()
})

test('QueryResolver: resolves locale from ?lang= query param', () => {
  const ctx = makeCtx({ query: { lang: 'de' } })
  const locale = QueryResolver.resolve(ctx)
  expect(locale).toBe('de')
})

test('QueryResolver: returns null when query param absent', () => {
  const ctx = makeCtx({})
  const locale = QueryResolver.resolve(ctx)
  expect(locale).toBeNull()
})

test('CookieResolver: resolves locale from cookie', () => {
  const ctx = makeCtx({ headers: { cookie: 'locale=ja; session=abc123' } })
  const locale = CookieResolver.resolve(ctx)
  expect(locale).toBe('ja')
})

test('CookieResolver: returns null when cookie absent', () => {
  const ctx = makeCtx({})
  const locale = CookieResolver.resolve(ctx)
  expect(locale).toBeNull()
})

// ---------------------------------------------------------------------------
// Resolver priority: header → query → cookie → fallback
// ---------------------------------------------------------------------------

test('i18n: resolver priority — header wins over query', () => {
  const svc = makeService({
    resolvers: [HeaderResolver, QueryResolver, CookieResolver],
  })
  const ctx = makeCtx({
    headers: { 'accept-language': 'fr', cookie: 'locale=ja' },
    query: { lang: 'de' },
  })
  const locale = svc.resolveLocale(ctx)
  expect(locale).toBe('fr')
})

test('i18n: resolver priority — query used when header absent', () => {
  const svc = makeService({
    resolvers: [HeaderResolver, QueryResolver, CookieResolver],
  })
  const ctx = makeCtx({ query: { lang: 'de' } })
  const locale = svc.resolveLocale(ctx)
  expect(locale).toBe('de')
})

test('i18n: resolver priority — cookie used when header + query absent', () => {
  const svc = makeService({
    resolvers: [HeaderResolver, QueryResolver, CookieResolver],
  })
  const ctx = makeCtx({ headers: { cookie: 'locale=ja' } })
  const locale = svc.resolveLocale(ctx)
  expect(locale).toBe('ja')
})

test('i18n: resolver priority — falls back to fallbackLocale when none match', () => {
  const svc = makeService({
    resolvers: [HeaderResolver, QueryResolver, CookieResolver],
  })
  const ctx = makeCtx({})
  const locale = svc.resolveLocale(ctx)
  expect(locale).toBe('en')
})

test('i18n: explicit locale string bypasses resolvers', () => {
  const svc = makeService({
    resolvers: [HeaderResolver],
  })
  const locale = svc.resolveLocale('fr')
  expect(locale).toBe('fr')
})

test('i18n: t with ctx resolves locale and translates', () => {
  const svc = makeService({
    resolvers: [HeaderResolver],
  })
  const ctx = makeCtx({ headers: { 'accept-language': 'fr' } })
  const result = svc.t('greeting', { name: 'monde' }, ctx)
  expect(result).toBe('Bonjour, monde!')
})

// ---------------------------------------------------------------------------
// Custom resolver
// ---------------------------------------------------------------------------

test('i18n: custom resolver works in resolver chain', () => {
  const alwaysFrench: LocaleResolver = {
    resolve: () => 'fr',
  }
  const svc = makeService({ resolvers: [alwaysFrench] })
  const ctx = makeCtx({})
  const result = svc.t('greeting', { name: 'monde' }, ctx)
  expect(result).toBe('Bonjour, monde!')
})
