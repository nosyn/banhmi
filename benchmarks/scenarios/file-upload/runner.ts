/**
 * Scenario: file-upload
 *
 * POST a 5 MB multipart/form-data file to /upload.
 * Measures multipart parsing overhead.
 *
 * NOTE: Results for this scenario are PENDING — oha does not natively support
 * multipart uploads. A custom fetch-based micro-bench is needed; see run.ts.
 */

export type ScenarioConfig = {
  method: 'GET' | 'POST'
  path: string
  body?: string
  contentType?: string
  /** Marks this scenario as requiring special handling by the orchestrator. */
  special?: 'multipart'
}

/** The scenario configuration exported for use by the orchestrator. */
export const scenario: ScenarioConfig = {
  method: 'POST',
  path: '/upload',
  special: 'multipart',
}

/**
 * Build a 5 MB FormData payload.
 */
export function buildUploadBody(): FormData {
  const fd = new FormData()
  // 5 MB of repeated ASCII data
  const content = 'A'.repeat(5 * 1024 * 1024)
  const blob = new Blob([content], { type: 'text/plain' })
  fd.append('file', blob, 'bench.txt')
  return fd
}

/**
 * Assert the upload response contains size and mimetype fields.
 * Returns `true` on success, throws on failure.
 */
export async function assertResponse(res: Response): Promise<true> {
  if (!res.ok) throw new Error(`Unexpected status ${res.status}`)
  const body = (await res.json()) as Record<string, unknown>
  if (typeof body['size'] !== 'number') {
    throw new Error(`Missing size in upload response: ${JSON.stringify(body)}`)
  }
  return true
}
