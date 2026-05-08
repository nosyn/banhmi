import { afterAll, beforeAll, expect, test } from 'bun:test'
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

test('scheduling: @Interval(100) fires at least 3 times in 350ms', async () => {
  // Wait 350ms for interval to fire multiple times
  await new Promise((r) => setTimeout(r, 350))

  const res = await fetch(`${base}/ticks`)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.ticks).toBeGreaterThanOrEqual(3)
})
