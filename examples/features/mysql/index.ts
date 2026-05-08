/**
 * Demo: @banhmi/mysql — MySQL integration backed by Bun.SQL (mysql adapter).
 *
 * Exposes a minimal REST API for a `Product` entity:
 *   GET  /products          — list all products
 *   GET  /products/:id      — get product by id
 *   POST /products          — create a product (JSON body: { name, price })
 *   DELETE /products/:id    — delete a product
 *
 * Requires MYSQL_URL to connect to MySQL/MariaDB. When MYSQL_URL is absent
 * the module still bootstraps, but all DB calls will fail at runtime.
 *
 * Backed by `Bun.SQL` with `adapter: 'mysql'` — natively supported in
 * Bun ≥ 1.2. No external npm packages are required.
 */

import type { Sql } from '@banhmi/mysql'
import {
  BaseRepository,
  InjectMysql,
  MYSQL_SQL,
  MysqlModule,
  Repository,
} from '@banhmi/mysql'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module, Post } from 'banhmi'

/** @internal */
export class Product {
  id!: number
  name!: string
  price!: number
}

/** Repository for Product entities backed by Bun.SQL MySQL adapter. */
@Repository(Product)
export class ProductRepository extends BaseRepository<Product> {
  static inject = [MYSQL_SQL] as const
  constructor(@InjectMysql() sql: Sql) {
    super(sql)
  }
}

/** REST controller for Product CRUD. */
@Controller('/products')
export class ProductController {
  static inject = [ProductRepository] as const
  constructor(private readonly repo: ProductRepository) {}

  @Get('/')
  async findAll() {
    return this.repo.findAll()
  }

  @Get('/:id')
  async findById(ctx: RouteCtx) {
    const id = Number(ctx.params.id)
    const product = await this.repo.findById(id)
    return product ?? { error: 'not found' }
  }

  @Post('/')
  async create(ctx: RouteCtx) {
    const body = (await ctx.request.json()) as Omit<Product, 'id'>
    return this.repo.insert(body)
  }
}

/** Root application module. */
@Module({
  imports: [
    MysqlModule.forRoot({ url: Bun.env.MYSQL_URL }),
    MysqlModule.forFeature([ProductRepository]),
  ],
  controllers: [ProductController],
})
export class AppModule {}
