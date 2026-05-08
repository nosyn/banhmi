import type { CorsOptions } from './cors.module'

/**
 * Determine whether the given `origin` is allowed by the CORS configuration.
 *
 * Returns the string to use as the `Access-Control-Allow-Origin` header
 * value, or `null` if the origin is rejected.
 *
 * @param origin - The value of the incoming `Origin` header (may be empty).
 * @param opts - CORS configuration options.
 * @returns Allowed origin string or `null`.
 *
 * @example
 * resolveOrigin('https://example.com', { origin: 'https://example.com' })
 * // 'https://example.com'
 */
export function resolveOrigin(
  origin: string,
  opts: CorsOptions,
): string | null {
  const allowed = opts.origin

  if (allowed === undefined || allowed === '*') {
    return '*'
  }

  if (typeof allowed === 'string') {
    return allowed === origin ? origin : null
  }

  if (Array.isArray(allowed)) {
    return allowed.includes(origin) ? origin : null
  }

  if (allowed instanceof RegExp) {
    return allowed.test(origin) ? origin : null
  }

  if (typeof allowed === 'function') {
    return allowed(origin) ? origin : null
  }

  return null
}

const DEFAULT_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'HEAD',
]

/**
 * Build the CORS response headers for a given request.
 *
 * @param req - The incoming HTTP request.
 * @param opts - CORS configuration.
 * @returns An object with the `Access-Control-*` headers to apply, or `null`
 *   if the request has no `Origin` header.
 *
 * @example
 * const headers = buildCorsHeaders(req, { origin: 'https://example.com' })
 */
export function buildCorsHeaders(
  req: Request,
  opts: CorsOptions,
): Record<string, string> | null {
  const origin = req.headers.get('origin') ?? ''
  if (!origin) return null

  const allowedOrigin = resolveOrigin(origin, opts)
  if (!allowedOrigin) return null

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigin,
  }

  if (opts.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  if (opts.exposedHeaders && opts.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = opts.exposedHeaders.join(', ')
  }

  return headers
}

/**
 * Build the preflight CORS response headers for an OPTIONS request.
 *
 * @param req - The incoming OPTIONS request.
 * @param opts - CORS configuration.
 * @returns An object with `Access-Control-*` preflight headers, or `null` if
 *   the origin is rejected.
 *
 * @example
 * const headers = buildPreflightHeaders(req, { origin: '*', maxAge: 600 })
 */
export function buildPreflightHeaders(
  req: Request,
  opts: CorsOptions,
): Record<string, string> | null {
  const base = buildCorsHeaders(req, opts)
  if (!base) return null

  const methods = opts.methods ?? DEFAULT_METHODS

  const requestedHeaders = req.headers.get('access-control-request-headers')
  const allowedHeaders =
    opts.allowedHeaders ??
    (requestedHeaders ? requestedHeaders.split(',').map((h) => h.trim()) : [])

  const headers: Record<string, string> = {
    ...base,
    'Access-Control-Allow-Methods': methods.join(', '),
  }

  if (allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = allowedHeaders.join(', ')
  }

  const maxAge = opts.maxAge ?? 5
  headers['Access-Control-Max-Age'] = String(maxAge)

  return headers
}
