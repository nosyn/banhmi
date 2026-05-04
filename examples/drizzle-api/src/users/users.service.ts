import { Injectable, NotFoundException } from 'banhmi'
import { eq } from 'drizzle-orm'
import type { DrizzleDB } from '../database/database.module'
import { DB_TOKEN } from '../database/database.module'
import { users } from '../database/schema'

@Injectable()
export class UsersService {
  static inject = [DB_TOKEN] as const

  constructor(private db: DrizzleDB) {}

  findAll() {
    return this.db.select().from(users).all()
  }

  findById(id: number) {
    const user = this.db.select().from(users).where(eq(users.id, id)).get()
    if (!user) throw new NotFoundException(`User #${id} not found`)
    return user
  }

  findWithPosts(id: number) {
    const result = this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: { posts: true },
    })
    if (!result) throw new NotFoundException(`User #${id} not found`)
    return result
  }

  create(name: string, email: string) {
    return this.db.insert(users).values({ name, email }).returning().get()
  }

  delete(id: number): void {
    this.findById(id)
    this.db.delete(users).where(eq(users.id, id)).run()
  }
}
