import { Controller, Get, HttpCode, Post } from 'banhmi'
import { PostsService } from './posts.service'
@Controller('/posts')
export class PostsController {
  posts
  static inject = [PostsService]
  constructor(posts) {
    this.posts = posts
  }
  @Get()
  findAll() {
    return this.posts.findAll()
  }
  @Get('/:id')
  findOne(ctx) {
    return this.posts.findById(Number(ctx.params.id))
  }
  @Post()
  @HttpCode(201)
  async create(ctx) {
    const { title, body, authorId } = await ctx.json()
    return this.posts.create(title, body, authorId)
  }
}
