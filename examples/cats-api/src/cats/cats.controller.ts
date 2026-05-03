import { Controller, Delete, Get, HttpCode, Post } from 'bunnest'
import type { RouteCtx } from 'bunnest'
import { CatsService } from './cats.service'

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
    const { name, age } = await ctx.json<{ name: string; age: number }>()
    return this.cats.create(name, age)
  }

  @Delete('/:id')
  @HttpCode(204)
  remove(ctx: RouteCtx) {
    this.cats.delete(Number(ctx.params.id))
  }
}
