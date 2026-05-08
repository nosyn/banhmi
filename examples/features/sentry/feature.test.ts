import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

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

describe('sentry feature: bootstrap with enabled: false', () => {
  test('application starts successfully without real Sentry DSN', async () => {
    const res = await fetch(`${base}/ping`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ pong: true })
  })
})
