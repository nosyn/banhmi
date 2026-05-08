import { Controller, Delete, Get, HttpCode, Post } from 'banhmi'
import { CatsService } from './cats.service'
@Controller('/cats')
export class CatsController {
  cats
  static inject = [CatsService]
  constructor(cats) {
    this.cats = cats
  }
  @Get()
  findAll() {
    return this.cats.findAll()
  }
  @Get('/:id')
  findOne(ctx) {
    return this.cats.findById(Number(ctx.params.id))
  }
  @Post()
  @HttpCode(201)
  async create(ctx) {
    const { name, age } = await ctx.json()
    return this.cats.create(name, age)
  }
  @Delete('/:id')
  @HttpCode(204)
  remove(ctx) {
    this.cats.delete(Number(ctx.params.id))
  }
}
