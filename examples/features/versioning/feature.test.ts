/**
 * Integration test for the versioning micro-example.
 * Boots a real server and verifies that /v1/cats and /v2/cats return
 * distinct responses.
 */

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { Controller, Get, Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Version, VersioningModule } from '@banhmi/versioning'

@Version('1')
@Controller('/cats')
class CatsV1Controller {
  @Get()
  findAll() {
    return { version: 1, cats: [{ name: 'Kitty' }] }
  }
}

@Version('2')
@Controller('/cats')
class CatsV2Controller {
  @Get()
  findAll() {
    return { version: 2, cats: [{ name: 'Luna' }, { name: 'Mochi' }] }
  }
}

@Module({
  imports: [VersioningModule.forRoot({ type: 'uri', prefix: 'v' })],
  controllers: [CatsV1Controller, CatsV2Controller],
})
class AppModule {}

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

test('GET /v1/cats returns version 1 payload', async () => {
  const res = await fetch(`${base}/v1/cats`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as { version: number; cats: unknown[] }
  expect(body.version).toBe(1)
  expect(body.cats).toHaveLength(1)
})

test('GET /v2/cats returns version 2 payload', async () => {
  const res = await fetch(`${base}/v2/cats`)
  expect(res.status).toBe(200)
  const body = (await res.json()) as { version: number; cats: unknown[] }
  expect(body.version).toBe(2)
  expect(body.cats).toHaveLength(2)
})

test('GET /v3/cats (unknown version) returns 404', async () => {
  const res = await fetch(`${base}/v3/cats`)
  expect(res.status).toBe(404)
})
