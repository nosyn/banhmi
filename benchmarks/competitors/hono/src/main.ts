import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

/**
 * Ten-field Zod schema for the validation benchmark scenario.
 */
const TenFieldSchema = z.object({
  f1: z.string(),
  f2: z.string(),
  f3: z.string(),
  f4: z.string(),
  f5: z.string(),
  n1: z.number(),
  n2: z.number(),
  n3: z.number(),
  n4: z.number(),
  n5: z.number(),
})

const app = new Hono()

/** hello-world baseline endpoint. */
app.get('/', (c) => c.json({ hello: 'world' }))

/** Echo the JSON request body back to the caller. */
app.post('/json', async (c) => {
  const body = await c.req.json<unknown>()
  return c.json(body)
})

/** Validate a ten-field DTO via Zod and respond `{ ok: true }`. */
app.post('/validate', zValidator('json', TenFieldSchema), (c) => {
  return c.json({ ok: true })
})

/** Accept a multipart file upload and respond with its size and MIME type. */
app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file
  if (file instanceof File) {
    return c.json({ mimetype: file.type, size: file.size })
  }
  return c.json({ mimetype: null, size: 0 })
})

const port = Number(Bun.env.PORT ?? 3004)
console.log(`hono listening on :${port}`)

export default {
  port,
  fetch: app.fetch,
}
