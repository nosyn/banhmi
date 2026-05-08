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

test('events: POST /users emits user.created; @OnEvent handler receives it', async () => {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Alice' }),
  })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.ok).toBe(true)

  // Give the emitter one tick to process sync listeners
  await Promise.resolve()

  const notifsRes = await fetch(`${base}/notifs`)
  const notifs = (await notifsRes.json()) as Array<{
    event: string
    payload: unknown
  }>
  expect(notifs.length).toBeGreaterThanOrEqual(1)
  const last = notifs[notifs.length - 1]
  expect(last?.event).toBe('user.created')
})
