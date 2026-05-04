import { Controller, Delete, Get, HttpCode, Post } from 'banhmi'
import type { RouteCtx } from 'banhmi'
import { UsersService } from './users.service'

@Controller('/users')
export class UsersController {
  static inject = [UsersService] as const

  constructor(private users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.users.findById(Number(ctx.params.id))
  }

  @Get('/:id/posts')
  findWithPosts(ctx: RouteCtx) {
    return this.users.findWithPosts(Number(ctx.params.id))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const { name, email } = await ctx.json<{ name: string; email: string }>()
    return this.users.create(name, email)
  }

  @Delete('/:id')
  @HttpCode(204)
  remove(ctx: RouteCtx) {
    this.users.delete(Number(ctx.params.id))
  }
}
