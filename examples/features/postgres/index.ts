/**
 * Demo: @banhmi/postgres — Postgres integration backed by Bun.SQL.
 *
 * Exposes a minimal REST API for a `User` entity:
 *   GET  /users          — list all users
 *   GET  /users/:id      — get user by id
 *   POST /users          — create a user (JSON body: { name, email })
 *   DELETE /users/:id    — delete a user
 *
 * Requires DATABASE_URL to connect to Postgres. When DATABASE_URL is absent
 * the module still bootstraps, but all DB calls will fail at runtime.
 */

import type { Sql } from '@banhmi/postgres'
import {
  BaseRepository,
  InjectSql,
  POSTGRES_SQL,
  PostgresModule,
  Repository,
} from '@banhmi/postgres'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module, Post } from 'banhmi'

/** @internal */
export class User {
  id!: number
  name!: string
  email!: string
}

/** Repository for User entities backed by Bun.SQL Postgres. */
@Repository(User)
export class UserRepository extends BaseRepository<User> {
  static inject = [POSTGRES_SQL] as const
  constructor(@InjectSql() sql: Sql) {
    super(sql)
  }
}

/** REST controller for User CRUD. */
@Controller('/users')
export class UserController {
  static inject = [UserRepository] as const
  constructor(private readonly repo: UserRepository) {}

  @Get('/')
  async findAll() {
    return this.repo.findAll()
  }

  @Get('/:id')
  async findById(ctx: RouteCtx) {
    const id = Number(ctx.params.id)
    const user = await this.repo.findById(id)
    return user ?? { error: 'not found' }
  }

  @Post('/')
  async create(ctx: RouteCtx) {
    const body = (await ctx.request.json()) as Omit<User, 'id'>
    return this.repo.insert(body)
  }
}

/** Root application module. */
@Module({
  imports: [
    PostgresModule.forRoot({ url: Bun.env.DATABASE_URL }),
    PostgresModule.forFeature([UserRepository]),
  ],
  controllers: [UserController],
})
export class AppModule {}
