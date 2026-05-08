/**
 * Scenario: db-cats
 *
 * Boot each competitor with an in-memory SQLite DB and run a CRUD cycle:
 * CREATE table → INSERT 100 rows → SELECT all → UPDATE one → DELETE one.
 * Measures total time for the cycle and rows/s.
 *
 * NOTE: Results for this scenario are PENDING — requires each competitor to
 * expose /cats CRUD endpoints backed by in-memory SQLite. Scaffolded here
 * for Wave 12 implementation.
 */

export type DbCatsResult = {
  /** Total time for the CRUD cycle in milliseconds. */
  totalMs: number
  /** Rows inserted. */
  rowsInserted: number
  /** Rows/s throughput. */
  rowsPerSec: number
  /** Note when scenario is pending. */
  note?: string
}

/** Scenario metadata for the orchestrator. */
export const scenario = {
  method: 'GET' as const,
  path: '/cats',
  special: 'db-crud' as const,
}

/**
 * Run the db-cats CRUD scenario against a single competitor.
 *
 * @param baseUrl - Base URL of the competitor (e.g. http://localhost:3001)
 */
export async function runDbCats(_baseUrl: string): Promise<DbCatsResult> {
  // TODO(Wave 12): implement full db-cats CRUD runner
  return {
    note: 'scaffolded — results pending Wave 12',
    rowsInserted: 0,
    rowsPerSec: 0,
    totalMs: 0,
  }
}
