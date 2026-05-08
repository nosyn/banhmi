/**
 * Scenario: cold-start
 *
 * Spawn a fresh competitor process, then poll GET / until the first 200 OK.
 * Measures time from process spawn to first successful response.
 *
 * This is a thin re-export of the `cold-start` runner in `benchmarks/runners/`.
 * The orchestrator (`run.ts`) drives this scenario directly via that runner.
 */

export type ScenarioConfig = {
  /** Marks this as a cold-start scenario (no HTTP load test). */
  special: 'cold-start'
  path: string
}

/** The scenario configuration exported for use by the orchestrator. */
export const scenario: ScenarioConfig = {
  path: '/',
  special: 'cold-start',
}
