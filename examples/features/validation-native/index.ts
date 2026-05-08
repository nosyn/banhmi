// Demo: @banhmi/validation — native adapter
//
// POST /cats — validates { name: string, age: number } via the built-in
//              native adapter. Returns 400 with structured errors on failure.

import { AdaptedValidationPipe, native } from '@banhmi/validation'
import type { RouteCtx } from 'banhmi'
import { Controller, Module, Post } from 'banhmi'

const createCatSchema = native({
  type: 'object',
  shape: { name: 'string', age: { type: 'optional', of: 'number' } },
  required: ['name'],
})

const pipe = new AdaptedValidationPipe(createCatSchema)

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
