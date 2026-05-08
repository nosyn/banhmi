/**
 * Scenario: rss-idle
 *
 * Spawn a competitor process, let it idle for 30 seconds, then snapshot its
 * RSS (Resident Set Size) in kilobytes via `ps -o rss`.
 *
 * This is a thin re-export of the `rss` runner in `benchmarks/runners/`.
 * The orchestrator (`run.ts`) drives this scenario directly via that runner.
 */

export type ScenarioConfig = {
  /** Marks this as an RSS-idle scenario (no HTTP load test). */
  special: 'rss-idle'
  path: string
}

/** The scenario configuration exported for use by the orchestrator. */
export const scenario: ScenarioConfig = {
  path: '/',
  special: 'rss-idle',
}
