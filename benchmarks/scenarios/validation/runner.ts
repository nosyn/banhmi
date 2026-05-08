/**
 * Scenario: validation
 *
 * POST a ten-field DTO to /validate and assert `{ ok: true }`.
 * Measures the cost of schema validation (Zod / class-validator / TypeBox)
 * inside the request lifecycle.
 */

export type ScenarioConfig = {
  method: 'GET' | 'POST'
  path: string
  body?: string
  contentType?: string
}

/** Valid ten-field payload — five strings + five numbers. */
const PAYLOAD = {
  f1: 'alpha',
  f2: 'bravo',
  f3: 'charlie',
  f4: 'delta',
  f5: 'echo',
  n1: 10,
  n2: 20,
  n3: 30,
  n4: 40,
  n5: 50,
}

/** The scenario configuration exported for use by the orchestrator. */
export const scenario: ScenarioConfig = {
  method: 'POST',
  path: '/validate',
  body: JSON.stringify(PAYLOAD),
  contentType: 'application/json',
}

/**
 * Assert the response reports successful validation.
 * Returns `true` on success, throws on failure.
 */
export async function assertResponse(res: Response): Promise<true> {
  if (!res.ok) throw new Error(`Unexpected status ${res.status}`)
  const body = (await res.json()) as Record<string, unknown>
  if (body['ok'] !== true) {
    throw new Error(`Validation failed: ${JSON.stringify(body)}`)
  }
  return true
}
