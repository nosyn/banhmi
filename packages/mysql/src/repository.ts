import type { Sql } from './types'

const REPO_ENTITY = Symbol('banhmi:mysql:repo_entity')
const REPO_TABLE = Symbol('banhmi:mysql:repo_table')

/**
 * Marks a class as a MySQL repository for the given entity.
 *
 * The decorator stores the entity constructor and infers the table name from
 * the entity class name (lowercased + `s` suffix). Override by implementing
 * `get tableName()` in the subclass.
 *
 * @example
 * class Product { id!: number; name!: string; price!: number }
 *
 * @Repository(Product)
 * class ProductRepository extends BaseRepository<Product> {}
 */
export function Repository(entity: new () => unknown) {
  return (_target: unknown, context: ClassDecoratorContext): void => {
    context.metadata[REPO_ENTITY] = entity
    context.metadata[REPO_TABLE] = `${entity.name.toLowerCase()}s`
  }
}

/**
 * Base repository class for MySQL entities using `Bun.SQL` tagged-template
 * queries with the `mysql` adapter.
 *
 * Subclass this, apply `@Repository(EntityClass)`, and provide a `Sql`
 * instance via the constructor. The `tableName` getter defaults to the
 * entity class name lowercased + `s`; override it in the subclass when
 * you need a different table name.
 *
 * All queries use `Bun.SQL` tagged-template literals for safe, parameterised
 * interpolation — no manual escaping is required.
 *
 * MySQL note: unlike Postgres, MySQL does not support `RETURNING *` on
 * `INSERT`/`UPDATE`/`DELETE`. `insert` returns the inserted row by
 * re-fetching via the `LAST_INSERT_ID()` scalar; `update` re-fetches by id.
 *
 * @example
 * class Product { id!: number; name!: string; price!: number }
 *
 * @Repository(Product)
 * class ProductRepository extends BaseRepository<Product> {}
 *
 * const repo = new ProductRepository(sql)
 * const products = await repo.findAll()
 */
export abstract class BaseRepository<T extends object> {
  /** MySQL table name. Defaults to entity name lower-cased + `s`. */
  get tableName(): string {
    const meta = (
      this.constructor as unknown as {
        [Symbol.metadata]?: Record<symbol, unknown>
      }
    )[Symbol.metadata]
    return (meta?.[REPO_TABLE] as string | undefined) ?? 'unknown'
  }

  constructor(protected readonly sql: Sql) {}

  /**
   * Returns every row in the table.
   *
   * @example
   * const all = await repo.findAll()
   */
  async findAll(): Promise<T[]> {
    const rows = await this.sql`SELECT * FROM ${this.sql(this.tableName)}`
    return rows as T[]
  }

  /**
   * Finds a single row by its numeric primary key.
   *
   * Returns `null` when no matching row exists.
   *
   * @example
   * const product = await repo.findById(1)
   */
  async findById(id: number): Promise<T | null> {
    const rows = await this
      .sql`SELECT * FROM ${this.sql(this.tableName)} WHERE id = ${id}`
    return (rows[0] as T | undefined) ?? null
  }

  /**
   * Inserts a new row and returns the full inserted row.
   *
   * MySQL does not support `RETURNING *`, so the row is re-fetched using
   * `LAST_INSERT_ID()` after the `INSERT`.
   *
   * @example
   * const product = await repo.insert({ name: 'Widget', price: 9.99 })
   */
  async insert(entity: Omit<T, 'id'>): Promise<T> {
    const data = entity as Record<string, unknown>
    await this.sql`INSERT INTO ${this.sql(this.tableName)} ${this.sql(data)}`
    const rows = await this
      .sql`SELECT * FROM ${this.sql(this.tableName)} WHERE id = LAST_INSERT_ID()`
    return rows[0] as T
  }

  /**
   * Updates an existing row by id and returns the updated row, or `null` if
   * no row with that id exists.
   *
   * @example
   * const updated = await repo.update(1, { name: 'Gadget' })
   */
  async update(id: number, entity: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const data = entity as Record<string, unknown>
    await this
      .sql`UPDATE ${this.sql(this.tableName)} SET ${this.sql(data)} WHERE id = ${id}`
    return this.findById(id)
  }

  /**
   * Deletes a row by its numeric primary key.
   *
   * @example
   * await repo.delete(1)
   */
  async delete(id: number): Promise<void> {
    await this.sql`DELETE FROM ${this.sql(this.tableName)} WHERE id = ${id}`
  }
}
