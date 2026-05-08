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

describe('otel feature: bootstrap with enabled: false', () => {
  test('application starts successfully without real OTel SDK', async () => {
    const res = await fetch(`${base}/hello`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ message: 'hello from otel demo' })
  })
})
