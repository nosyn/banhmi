import type { RouteCtx } from 'banhmi'
import { Controller, Delete, Get, HttpCode, Post } from 'banhmi'
import type { Cat } from './cats.entity'
import { CatsRepository } from './cats.repository'

/**
 * REST controller for Cat CRUD via MongoDB.
 *
 * Routes:
 *   GET    /cats        — list all cats
 *   POST   /cats        — create a cat (JSON body: { name, age })
 *   GET    /cats/:id    — get cat by MongoDB ObjectId string
 *   DELETE /cats/:id    — delete cat by MongoDB ObjectId string
 */
@Controller('/cats')
export class CatsController {
  static inject = [CatsRepository] as const

  constructor(private readonly cats: CatsRepository) {}

  @Get()
  findAll() {
    return this.cats.find({})
  }

  @Get('/:id')
  async findOne(ctx: RouteCtx) {
    const id = ctx.params.id ?? ''
    const cat = await this.cats.findById(id)
    if (!cat) return Response.json({ error: 'not found' }, { status: 404 })
    return cat
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const { name, age } = await ctx.json<Omit<Cat, '_id'>>()
    return this.cats.insertOne({ name, age })
  }

  @Delete('/:id')
  @HttpCode(204)
  async remove(ctx: RouteCtx) {
    const id = ctx.params.id ?? ''
    await this.cats.deleteOne({ _id: id })
  }
}
