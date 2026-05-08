import { Injectable, NotFoundException } from 'banhmi'
import { eq } from 'drizzle-orm'
import { DB_TOKEN } from '../database/database.module'
import { users } from '../database/schema'
@Injectable()
export class UsersService {
  db
  static inject = [DB_TOKEN]
  constructor(db) {
    this.db = db
  }
  findAll() {
    return this.db.select().from(users).all()
  }
  findById(id) {
    const user = this.db.select().from(users).where(eq(users.id, id)).get()
    if (!user) throw new NotFoundException(`User #${id} not found`)
    return user
  }
  findWithPosts(id) {
    const result = this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: { posts: true },
    })
    if (!result) throw new NotFoundException(`User #${id} not found`)
    return result
  }
  create(name, email) {
    return this.db.insert(users).values({ name, email }).returning().get()
  }
  delete(id) {
    this.findById(id)
    this.db.delete(users).where(eq(users.id, id)).run()
  }
}
