import type { RouteCtx } from 'banhmi'
import { Controller, Get, HttpCode, Post } from 'banhmi'
import { PostsService } from './posts.service'

@Controller('/posts')
export class PostsController {
  static inject = [PostsService] as const

  constructor(private posts: PostsService) {}

  @Get()
  findAll() {
    return this.posts.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.posts.findById(Number(ctx.params.id))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const { title, body, authorId } = await ctx.json<{
      title: string
      body: string
      authorId: number
    }>()
    return this.posts.create(title, body, authorId)
  }
}
