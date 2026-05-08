import { Controller, Delete, Get, HttpCode, Post } from 'banhmi'
import { UsersService } from './users.service'
@Controller('/users')
export class UsersController {
  users
  static inject = [UsersService]
  constructor(users) {
    this.users = users
  }
  @Get()
  findAll() {
    return this.users.findAll()
  }
  @Get('/:id')
  findOne(ctx) {
    return this.users.findById(Number(ctx.params.id))
  }
  @Get('/:id/posts')
  findWithPosts(ctx) {
    return this.users.findWithPosts(Number(ctx.params.id))
  }
  @Post()
  @HttpCode(201)
  async create(ctx) {
    const { name, email } = await ctx.json()
    return this.users.create(name, email)
  }
  @Delete('/:id')
  @HttpCode(204)
  remove(ctx) {
    this.users.delete(Number(ctx.params.id))
  }
}
