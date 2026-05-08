/**
 * Demo: @banhmi/drizzle — Drizzle ORM integration with an in-memory SQLite database.
 *
 * Exposes a minimal REST API for a `Cat` entity:
 *   GET  /cats       — list all cats
 *   POST /cats       — create a cat (JSON body: { name, breed? })
 *   GET  /cats/:id   — get cat by id
 */

import {
  DRIZZLE_DB,
  DrizzleModule,
  InjectDb,
  sqliteDriver,
} from '@banhmi/drizzle'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module, Post } from 'banhmi'
import { eq, sql } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'
import { type Cat, cats, type NewCat } from './schema'

/** Service that performs Drizzle queries against the SQLite cats table. */
export class CatService {
  static inject = [DRIZZLE_DB] as const

  constructor(
    @InjectDb() private readonly db: BunSQLiteDatabase<typeof schema>,
  ) {}

  /** Ensures the cats table exists (idempotent). */
  private ensureTable(): void {
    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS cats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        breed TEXT NOT NULL DEFAULT 'unknown'
      )
    `)
  }

  /**
   * Returns all cats.
   *
   * @example
   * const all = await service.findAll()
   */
  findAll(): Cat[] {
    this.ensureTable()
    return this.db.select().from(cats).all()
  }

  /**
   * Returns a single cat by its integer primary key, or `null` when not found.
   *
   * @example
   * const cat = await service.findById(1)
   */
  findById(id: number): Cat | null {
    this.ensureTable()
    const rows = this.db.select().from(cats).where(eq(cats.id, id)).all()
    return rows[0] ?? null
  }

  /**
   * Inserts a new cat and returns the inserted row.
   *
   * @example
   * const cat = await service.create({ name: 'Kitty', breed: 'Siamese' })
   */
  create(data: NewCat): Cat {
    this.ensureTable()
    const rows = this.db.insert(cats).values(data).returning().all()
    const row = rows[0]
    if (!row) throw new Error('Insert returned no rows')
    return row
  }
}

/** REST controller for Cat CRUD. */
@Controller('/cats')
export class CatController {
  static inject = [CatService] as const
  constructor(private readonly cats: CatService) {}

  @Get()
  findAll() {
    return this.cats.findAll()
  }

  @Get('/:id')
  findById(ctx: RouteCtx) {
    const id = Number(ctx.params.id)
    const cat = this.cats.findById(id)
    return cat ?? { error: 'not found' }
  }

  @Post()
  async create(ctx: RouteCtx) {
    const body = (await ctx.request.json()) as NewCat
    return this.cats.create(body)
  }
}

/** Root application module. */
@Module({
  imports: [
    DrizzleModule.forRoot({
      driver: sqliteDriver({ filename: ':memory:' }),
      schema,
    }),
  ],
  providers: [CatService],
  controllers: [CatController],
})
export class AppModule {}
