/**
 * Task entity — maps to the `tasks` SQLite table.
 *
 * Used with {@link SqliteRepository} for type-safe active-record queries.
 */
export class Task {
  /** Auto-incremented primary key. */
  id: number = 0

  /** Short title of the task. */
  title: string = ''

  /**
   * Current status. One of: `pending`, `in-progress`, `done`.
   */
  status: string = 'pending'

  /** Optional free-text description. */
  description: string = ''

  /** ISO timestamp string of when the task was created. */
  createdAt: string = ''
}
