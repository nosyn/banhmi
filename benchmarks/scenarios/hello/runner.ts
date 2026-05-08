/**
 * Scenario: hello
 *
 * Baseline GET / — the simplest possible request. Measures raw framework
 * routing + response overhead with no body parsing.
 */

export type ScenarioConfig = {
  /** HTTP method to use. */
  method: 'GET' | 'POST'
  /** Path to request. */
  path: string
  /** Optional JSON body (stringified). */
  body?: string
  /** Content-Type header (defaults to application/json for POST). */
  contentType?: string
}

/** The scenario configuration exported for use by the orchestrator. */
export const scenario: ScenarioConfig = {
  method: 'GET',
  path: '/',
}

/**
 * Assert the response from a hello endpoint is valid.
 * Returns `true` on success, throws on failure.
 */
export async function assertResponse(res: Response): Promise<true> {
  if (!res.ok) throw new Error(`Unexpected status ${res.status}`)
  const body = (await res.json()) as Record<string, unknown>
  if (body['hello'] !== 'world') {
    throw new Error(`Unexpected body: ${JSON.stringify(body)}`)
  }
  return true
}
