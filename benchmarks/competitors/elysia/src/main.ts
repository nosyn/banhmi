import { Elysia, t } from 'elysia'

/**
 * Ten-field schema using Elysia's built-in `t.Object` validator (TypeBox).
 */
const TenFieldSchema = t.Object({
  f1: t.String(),
  f2: t.String(),
  f3: t.String(),
  f4: t.String(),
  f5: t.String(),
  n1: t.Number(),
  n2: t.Number(),
  n3: t.Number(),
  n4: t.Number(),
  n5: t.Number(),
})

const port = Number(Bun.env.PORT ?? 3005)

const app = new Elysia()
  /** hello-world baseline endpoint. */
  .get('/', () => ({ hello: 'world' }))

  /** Echo the JSON request body back to the caller. */
  .post('/json', ({ body }) => body, {
    body: t.Unknown(),
  })

  /** Validate a ten-field DTO via Elysia's TypeBox validator and respond `{ ok: true }`. */
  .post('/validate', () => ({ ok: true }), {
    body: TenFieldSchema,
  })

  /** Accept a multipart file upload and respond with its size and MIME type. */
  .post(
    '/upload',
    ({ body }) => {
      const file = (body as Record<string, unknown>)['file']
      if (file instanceof File) {
        return { mimetype: file.type, size: file.size }
      }
      return { mimetype: null, size: 0 }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    },
  )

  .listen(port)

console.log(`elysia listening on :${port}`)
