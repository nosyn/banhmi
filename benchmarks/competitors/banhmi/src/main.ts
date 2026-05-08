import { getUploadedFileMeta, UploadedFile } from '@banhmi/multipart'
import { AdaptedValidationPipe } from '@banhmi/validation'
import { zod } from '@banhmi/validation/zod'
import type { RouteCtx } from 'banhmi'
import { BanhmiFactory, Controller, Get, Module, Post } from 'banhmi'
import { z } from 'zod'

/**
 * Ten-field Zod schema used for the validation benchmark scenario.
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

const validatePipe = new AdaptedValidationPipe(zod(TenFieldSchema))

@Controller()
class Hello {
  /** hello-world baseline endpoint. */
  @Get('/')
  hello() {
    return { hello: 'world' }
  }

  /** Echo the JSON request body back to the caller. */
  @Post('/json')
  async echo(ctx: RouteCtx) {
    const body = await ctx.json<unknown>()
    return body
  }

  /** Validate a ten-field DTO via Zod and respond `{ ok: true }`. */
  @Post('/validate')
  async validate(ctx: RouteCtx) {
    const body = await ctx.json<unknown>()
    validatePipe.transform(body, { type: 'body' })
    return { ok: true }
  }

  /** Accept a multipart file upload and respond with its size and MIME type. */
  @Post('/upload')
  @UploadedFile('file')
  upload(ctx: RouteCtx) {
    const file = getUploadedFileMeta(ctx, 'file')
    return { mimetype: file?.mimetype ?? null, size: file?.size ?? 0 }
  }
}

@Module({ controllers: [Hello] })
class AppModule {}

const port = Number(Bun.env.PORT ?? 3001)
const app = await BanhmiFactory.create(AppModule)
await app.listen(port)
console.log(`banhmi listening on :${port}`)
