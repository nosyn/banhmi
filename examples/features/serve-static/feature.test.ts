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

test('serve-static: GET /static/hello.txt returns 200 with file content', async () => {
  const res = await fetch(`${base}/static/hello.txt`)
  expect(res.status).toBe(200)
  expect(await res.text()).toContain('Hello from @banhmi/static!')
})

test('serve-static: GET /static/ serves index.html', async () => {
  const res = await fetch(`${base}/static/`)
  expect(res.status).toBe(200)
  const body = await res.text()
  expect(body).toContain('Served by @banhmi/static')
})
