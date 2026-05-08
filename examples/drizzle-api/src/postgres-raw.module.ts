/**
 * Alternative application module that demonstrates raw Bun.SQL Postgres via
 * `@banhmi/postgres` — no Drizzle ORM involved.
 *
 * Activated with: bun run src/main.ts --mode=postgres-raw
 *
 * Requires DATABASE_URL env var pointing to a live Postgres instance.
 *
 * This module exposes a simple `Cat` CRUD API at `/cats` using
 * `@banhmi/postgres` `BaseRepository<Cat>` and `PostgresModule.forRoot`.
 */

import {
  BaseRepository,
  POSTGRES_SQL,
  PostgresModule,
  Repository,
} from '@banhmi/postgres'
import type { RouteCtx } from 'banhmi'
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  Post,
} from 'banhmi'

/** Simple Cat entity for the postgres-raw demonstration. */
export class Cat {
  id!: number
  name!: string
  age!: number
}

/**
 * Postgres repository for the `Cat` entity.
 *
 * Table name is inferred as `cats` (entity name lowercased + s).
 * The table must already exist — run the following DDL before starting:
 *   CREATE TABLE IF NOT EXISTS cats (id SERIAL PRIMARY KEY, name TEXT NOT NULL, age INT NOT NULL DEFAULT 0);
 */
@Repository(Cat)
export class CatsRepository extends BaseRepository<Cat> {
  static inject = [POSTGRES_SQL] as const

  constructor(
    sql: InstanceType<typeof import('@banhmi/postgres').BaseRepository>['sql'],
  ) {
    super(sql as Parameters<typeof BaseRepository.prototype.constructor>[0])
  }
}

/** Cats service that delegates to `CatsRepository`. */
@Injectable()
export class RawCatsService {
  static inject = [CatsRepository] as const

  constructor(private readonly repo: CatsRepository) {}

  findAll() {
    return this.repo.findAll()
  }

  findById(id: number) {
    return this.repo.findById(id)
  }

  create(name: string, age: number) {
    return this.repo.insert({ name, age } as Omit<Cat, 'id'>)
  }

  delete(id: number) {
    return this.repo.delete(id)
  }
}

/** REST controller for the postgres-raw Cat entity. */
@Controller('/cats')
export class RawCatsController {
  static inject = [RawCatsService] as const

  constructor(private readonly cats: RawCatsService) {}

  @Get()
  findAll() {
    return this.cats.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.cats.findById(Number(ctx.params.id))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const { name, age } = await ctx.json<{ name: string; age: number }>()
    return this.cats.create(name, age ?? 0)
  }

  @Delete('/:id')
  @HttpCode(204)
  remove(ctx: RouteCtx) {
    return this.cats.delete(Number(ctx.params.id))
  }
}

/**
 * Root module for the postgres-raw boot mode.
 *
 * Imports `PostgresModule.forRoot` (which reads DATABASE_URL automatically)
 * and registers `CatsRepository` via `PostgresModule.forFeature`.
 */
@Module({
  imports: [
    PostgresModule.forRoot({ url: Bun.env.DATABASE_URL }),
    PostgresModule.forFeature([CatsRepository]),
  ],
  controllers: [RawCatsController],
  providers: [RawCatsService],
})
export class PostgresRawAppModule {}
