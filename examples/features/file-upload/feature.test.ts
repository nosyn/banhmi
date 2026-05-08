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

test('file-upload: POST /upload returns size and mimetype', async () => {
  const fd = new FormData()
  fd.append(
    'file',
    new Blob([new Uint8Array(2048)], { type: 'image/png' }),
    'photo.png',
  )

  const res = await fetch(`${base}/upload`, { method: 'POST', body: fd })
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.size).toBe(2048)
  expect(body.mimetype).toBe('image/png')
})

test('file-upload: missing file field returns 400', async () => {
  const fd = new FormData()
  fd.append('other', 'text-field')

  const res = await fetch(`${base}/upload`, { method: 'POST', body: fd })
  expect(res.status).toBe(400)
})

test('file-upload: non-multipart request returns 400', async () => {
  const res = await fetch(`${base}/upload`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file: 'data' }),
  })
  expect(res.status).toBe(400)
})
