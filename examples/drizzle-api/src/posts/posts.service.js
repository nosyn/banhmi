import { Injectable, NotFoundException } from 'banhmi'
import { eq } from 'drizzle-orm'
import { DB_TOKEN } from '../database/database.module'
import { posts } from '../database/schema'
@Injectable()
export class PostsService {
  db
  static inject = [DB_TOKEN]
  constructor(db) {
    this.db = db
  }
  findAll() {
    return this.db.query.posts.findMany({ with: { author: true } })
  }
  findById(id) {
    const post = this.db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: { author: true },
    })
    if (!post) throw new NotFoundException(`Post #${id} not found`)
    return post
  }
  create(title, body, authorId) {
    return this.db
      .insert(posts)
      .values({ title, body, authorId })
      .returning()
      .get()
  }
}
