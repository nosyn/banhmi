import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { StaticModule } from '../src'

// ─── Shared fixture ──────────────────────────────────────────────────────────

let app: BanhmiApplication
let baseUrl: string
let root: string

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'banhmi-static-'))
  writeFileSync(join(root, 'hello.txt'), 'world')
  writeFileSync(join(root, 'style.css'), 'body {}')
  writeFileSync(join(root, 'index.html'), '<h1>hi</h1>')

  @Module({ imports: [StaticModule.forRoot({ root, prefix: '/assets' })] })
  class AppModule {}

  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  baseUrl = app.getUrl()
})

afterAll(async () => {
  await app.close()
  rmSync(root, { force: true, recursive: true })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

test('serves a file under the prefix', async () => {
  const res = await fetch(`${baseUrl}/assets/hello.txt`)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('world')
})

test('sets Cache-Control with default max-age', async () => {
  const res = await fetch(`${baseUrl}/assets/hello.txt`)
  const cc = res.headers.get('cache-control') ?? ''
  expect(cc).toContain('public')
  expect(cc).toContain('max-age=86400')
})

test('sets correct content-type for css', async () => {
  const res = await fetch(`${baseUrl}/assets/style.css`)
  expect(res.status).toBe(200)
  const ct = res.headers.get('content-type') ?? ''
  expect(ct).toContain('text/css')
})

test('serves index.html when path ends with /', async () => {
  const res = await fetch(`${baseUrl}/assets/`)
  expect(res.status).toBe(200)
  expect(await res.text()).toContain('<h1>hi</h1>')
})

test('falls through for missing files when fallthrough is true (default)', async () => {
  const res = await fetch(`${baseUrl}/assets/nonexistent.txt`)
  // fallthrough=true → falls through to router → 404 JSON from router
  expect(res.status).toBe(404)
})

test('rejects path traversal attempts', async () => {
  // URL-encode the traversal so fetch does not normalise it away
  const traversal = '/assets/..%2F..%2Fetc%2Fpasswd'
  const res = await fetch(`${baseUrl}${traversal}`)
  expect([403, 404]).toContain(res.status)
})

// ─── immutable flag ───────────────────────────────────────────────────────────

let immutableApp: BanhmiApplication
let immutableBase: string
let immutableRoot: string

beforeAll(async () => {
  immutableRoot = mkdtempSync(join(tmpdir(), 'banhmi-static-immutable-'))
  writeFileSync(join(immutableRoot, 'asset.js'), 'const x=1')

  @Module({
    imports: [
      StaticModule.forRoot({
        root: immutableRoot,
        prefix: '/cdn',
        immutable: true,
        maxAge: 31536000,
      }),
    ],
  })
  class ImmutableAppModule {}

  immutableApp = await BanhmiFactory.create(ImmutableAppModule)
  await immutableApp.listen(0)
  immutableBase = immutableApp.getUrl()
})

afterAll(async () => {
  await immutableApp.close()
  rmSync(immutableRoot, { force: true, recursive: true })
})

test('respects immutable option — appends immutable to Cache-Control', async () => {
  const res = await fetch(`${immutableBase}/cdn/asset.js`)
  expect(res.status).toBe(200)
  const cc = res.headers.get('cache-control') ?? ''
  expect(cc).toContain('immutable')
  expect(cc).toContain('max-age=31536000')
})

// ─── fallthrough=false ────────────────────────────────────────────────────────

let noFallApp: BanhmiApplication
let noFallBase: string
let noFallRoot: string

beforeAll(async () => {
  noFallRoot = mkdtempSync(join(tmpdir(), 'banhmi-static-nofallthrough-'))
  writeFileSync(join(noFallRoot, 'present.txt'), 'here')

  @Module({
    imports: [
      StaticModule.forRoot({
        root: noFallRoot,
        prefix: '/files',
        fallthrough: false,
      }),
    ],
  })
  class NoFallModule {}

  noFallApp = await BanhmiFactory.create(NoFallModule)
  await noFallApp.listen(0)
  noFallBase = noFallApp.getUrl()
})

afterAll(async () => {
  await noFallApp.close()
  rmSync(noFallRoot, { force: true, recursive: true })
})

test('returns 404 for missing files when fallthrough is false', async () => {
  const res = await fetch(`${noFallBase}/files/missing.txt`)
  expect(res.status).toBe(404)
})

test('still serves existing files when fallthrough is false', async () => {
  const res = await fetch(`${noFallBase}/files/present.txt`)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('here')
})
