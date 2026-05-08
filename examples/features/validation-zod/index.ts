// Demo: @banhmi/validation — Zod adapter
//
// POST /cats — validates { name: string, age: number } via Zod schema.
// The Zod adapter is imported from the subpath @banhmi/validation/zod so
// users who don't install zod are not affected.

import { AdaptedValidationPipe } from '@banhmi/validation'
import { zod } from '@banhmi/validation/zod'
import type { RouteCtx } from 'banhmi'
import { Controller, Module, Post } from 'banhmi'
import { z } from 'zod'

const CreateCatSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
})

const pipe = new AdaptedValidationPipe(zod(CreateCatSchema))

@Controller('/cats')
export class CatsController {
  @Post()
  async create(ctx: RouteCtx) {
    const body = await ctx.json()
    const dto = pipe.transform(body, { type: 'body' })
    return { created: true, data: dto }
  }
}

@Module({ controllers: [CatsController] })
export class AppModule {}
