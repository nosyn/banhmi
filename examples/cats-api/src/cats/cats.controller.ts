import { AdaptedValidationPipe } from '@banhmi/validation'
import { zod } from '@banhmi/validation/zod'
import type { RouteCtx } from 'banhmi'
import { Controller, Delete, Get, HttpCode, Post } from 'banhmi'
import { z } from 'zod'
import { CatsService } from './cats.service'

/**
 * Zod schema used to validate the CreateCat request body.
 */
export const CreateCatSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
})

/**
 * Validated CreateCat DTO type.
 */
export type CreateCatDto = z.infer<typeof CreateCatSchema>

/** Shared pipe instance reused across handlers. */
const createCatPipe = new AdaptedValidationPipe(zod(CreateCatSchema))

/**
 * Handles CRUD operations for cats (v1 controller — returns `{ id, name }`).
 */
@Controller('/cats')
export class CatsController {
  static inject = [CatsService] as const

  constructor(private cats: CatsService) {}

  @Get()
  findAll() {
    return this.cats.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.cats.findById(Number(ctx.params.id))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const body = await ctx.json<unknown>()
    const dto = createCatPipe.transform(body, { type: 'body' })
    return this.cats.create(dto.name, dto.age)
  }

  @Delete('/:id')
  @HttpCode(204)
  remove(ctx: RouteCtx) {
    this.cats.delete(Number(ctx.params.id))
  }
}
