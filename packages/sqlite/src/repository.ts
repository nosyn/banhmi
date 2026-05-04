import type { Database } from 'bun:sqlite'

const REPO_ENTITY = Symbol('banhmi:sqlite:repo_entity')

export function Repository(entity: new () => unknown) {
  return (_target: unknown, context: ClassDecoratorContext): void => {
    context.metadata[REPO_ENTITY] = entity
  }
}

export abstract class BaseRepository<T extends object> {
  abstract readonly tableName: string

  constructor(protected readonly db: Database) {}

  private get Entity(): new () => T {
    const meta = (
      this.constructor as unknown as {
        [Symbol.metadata]?: Record<symbol, unknown>
      }
    )[Symbol.metadata]
    return (
      (meta?.[REPO_ENTITY] as (new () => T) | undefined) ??
      (Object as unknown as new () => T)
    )
  }

  findAll(): T[] {
    return this.db
      .query<T, []>(`SELECT * FROM ${this.tableName}`)
      .as(this.Entity)
      .all()
  }

  findById(id: number): T | null {
    return (
      this.db
        .query<T, [number]>(`SELECT * FROM ${this.tableName} WHERE id = ?`)
        .as(this.Entity)
        .get(id) ?? null
    )
  }

  save(data: Omit<T, 'id'>): number {
    const keys = Object.keys(data as Record<string, unknown>)
    const placeholders = keys.map(() => '?').join(', ')
    const values = Object.values(data as Record<string, unknown>)
    const result = this.db
      .query<{ id: number }, unknown[]>(
        `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      )
      .get(...values)
    return result?.id ?? 0
  }

  delete(id: number): void {
    this.db
      .query<void, [number]>(`DELETE FROM ${this.tableName} WHERE id = ?`)
      .run(id)
  }

  transaction<R>(fn: () => R): R {
    return this.db.transaction(fn)()
  }
}
