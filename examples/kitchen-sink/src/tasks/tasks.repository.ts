import type { Database } from 'bun:sqlite'
import {
  DATABASE_TOKEN,
  Repository,
  SqliteBaseRepository,
} from '@banhmi/sqlite'
import { Task } from './tasks.entity'

/**
 * SQLite-backed repository for {@link Task} entities.
 *
 * Extends {@link SqliteBaseRepository} which provides `findAll`, `findById`,
 * `save`, and `delete`. Additional task-specific queries are added here.
 */
@Repository(Task)
export class TasksRepository extends SqliteBaseRepository<Task> {
  static inject = [DATABASE_TOKEN] as const

  readonly tableName = 'tasks'

  constructor(db: Database) {
    super(db)
    this.init()
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        status      TEXT    NOT NULL DEFAULT 'pending',
        description TEXT    NOT NULL DEFAULT '',
        createdAt   TEXT    NOT NULL
      )
    `)
  }

  /**
   * Delete tasks older than `olderThanMs` milliseconds.
   *
   * Used by the cleanup cron job.
   *
   * @param olderThanMs - Age threshold in milliseconds.
   * @returns Number of deleted rows.
   */
  deleteOlderThan(olderThanMs: number): number {
    const cutoff = new Date(Date.now() - olderThanMs).toISOString()
    const stmt = this.db.query<{ changes: number }, [string]>(
      `DELETE FROM tasks WHERE createdAt < ? RETURNING changes`,
    )
    const row = stmt.get(cutoff)
    return row?.changes ?? 0
  }

  /**
   * Patch a task by id; only updates provided fields.
   *
   * @param id - Task ID to update.
   * @param patch - Partial task fields.
   */
  update(
    id: number,
    patch: { title?: string; status?: string; description?: string },
  ): Task | null {
    const fields = Object.entries(patch).filter(([, v]) => v !== undefined)
    if (fields.length === 0) return this.findById(id)
    const setClauses = fields.map(([k]) => `${k} = ?`).join(', ')
    const values = fields.map(([, v]) => v)
    this.db
      .query<void, unknown[]>(`UPDATE tasks SET ${setClauses} WHERE id = ?`)
      .run(...values, id)
    return this.findById(id)
  }
}
