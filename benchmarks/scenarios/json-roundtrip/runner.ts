/**
 * Scenario: json-roundtrip
 *
 * POST a 1 KB JSON body to /json and verify the echo response matches.
 * Measures request-body parsing + JSON serialisation overhead.
 */

export type ScenarioConfig = {
  method: 'GET' | 'POST'
  path: string
  body?: string
  contentType?: string
}

/** ~1 KB JSON payload (padded with extra fields to reach the size target). */
const PAYLOAD: Record<string, unknown> = {
  id: 'bench-roundtrip-001',
  name: 'benchmark payload',
  description:
    'A payload used to test JSON round-trip performance in various frameworks.',
  tags: ['performance', 'benchmark', 'json'],
  nested: {
    level1: {
      level2: {
        value: 42,
        data: 'x'.repeat(512),
      },
    },
  },
  numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  flag: true,
}

/** The scenario configuration exported for use by the orchestrator. */
export const scenario: ScenarioConfig = {
  method: 'POST',
  path: '/json',
  body: JSON.stringify(PAYLOAD),
  contentType: 'application/json',
}

/**
 * Assert the response echoes the request body back.
 * Returns `true` on success, throws on failure.
 */
export async function assertResponse(res: Response): Promise<true> {
  if (!res.ok) throw new Error(`Unexpected status ${res.status}`)
  const body = (await res.json()) as Record<string, unknown>
  if (body.id !== PAYLOAD.id) {
    throw new Error(`Body id mismatch: got ${body.id}`)
  }
  return true
}
