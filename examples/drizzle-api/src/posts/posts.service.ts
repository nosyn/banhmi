import { Injectable, NotFoundException } from 'banhmi'
import { eq } from 'drizzle-orm'
import type { DrizzleDB } from '../database/database.module'
import { DB_TOKEN } from '../database/database.module'
import { posts } from '../database/schema'

@Injectable()
export class PostsService {
  static inject = [DB_TOKEN] as const

  constructor(private db: DrizzleDB) {}

  findAll() {
    return this.db.query.posts.findMany({ with: { author: true } })
  }

  findById(id: number) {
    const post = this.db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: { author: true },
    })
    if (!post) throw new NotFoundException(`Post #${id} not found`)
    return post
  }

  create(title: string, body: string, authorId: number) {
    return this.db
      .insert(posts)
      .values({ title, body, authorId })
      .returning()
      .get()
  }
}
