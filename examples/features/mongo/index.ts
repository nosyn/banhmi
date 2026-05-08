/**
 * Demo: @banhmi/mongo — MongoDB integration with the native `mongodb` driver.
 *
 * Exposes a minimal REST API for a `Cat` entity:
 *   GET  /cats       — list all cats
 *   POST /cats       — create a cat (JSON body: { name, breed })
 *   GET  /cats/:id   — get cat by id
 *
 * When `MONGO_URL` is set the module connects to a real MongoDB server.
 * Without it the module bootstraps but collection calls will fail at runtime.
 */

import {
  MONGO_DB,
  MongoModule,
  MongoRepository,
  Repository,
} from '@banhmi/mongo'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module, Post } from 'banhmi'

/** Cat document stored in MongoDB. */
export interface Cat {
  _id?: unknown
  name: string
  breed: string
}

/** Entity class used as the @Repository target. */
export class CatEntity {
  name!: string
  breed!: string
}

/** MongoDB repository for `Cat` documents in the `catentity` collection. */
@Repository(CatEntity)
export class CatRepository extends MongoRepository<Cat> {
  static inject = [MONGO_DB] as const
  constructor(db: { collection: (name: string) => unknown }) {
    super(db as Parameters<typeof MongoRepository.prototype.constructor>[0])
  }

  /** Override to use 'cats' as the collection name instead of 'catentity'. */
  override get collectionName(): string {
    return 'cats'
  }
}

/** REST controller for Cat CRUD. */
@Controller('/cats')
export class CatController {
  static inject = [CatRepository] as const
  constructor(private readonly cats: CatRepository) {}

  @Get()
  async findAll() {
    return this.cats.find({})
  }

  @Get('/:id')
  async findById(ctx: RouteCtx) {
    const id = ctx.params.id ?? ''
    const cat = await this.cats.findById(id)
    return cat ?? { error: 'not found' }
  }

  @Post()
  async create(ctx: RouteCtx) {
    const body = (await ctx.request.json()) as Omit<Cat, '_id'>
    return this.cats.insertOne(body)
  }
}

/** Root application module. */
@Module({
  imports: [
    MongoModule.forRoot({
      url: Bun.env.MONGO_URL ?? 'mongodb://localhost:27017',
      database: 'cats',
    }),
    MongoModule.forFeature([CatRepository]),
  ],
  controllers: [CatController],
})
export class AppModule {}
