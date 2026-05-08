import type { VersioningOptions } from './versioning.module'

/**
 * Resolves the requested API version from a `Request` object using the
 * configured versioning strategy.
 *
 * - **`uri`** — extracts the version segment from the pathname
 *   (e.g. `/v1/cats` → `'1'` when `prefix = 'v'`).
 * - **`header`** — reads the named request header directly.
 * - **`media-type`** — parses the `Accept` header for a vendor MIME type
 *   of the form `application/vnd.<key>.v<N>+json`.
 *
 * Returns `null` when no version can be resolved and no `defaultVersion` is
 * configured.
 *
 * @param req - The incoming `Request`.
 * @param opts - Active versioning configuration.
 * @returns The resolved version string, or `null`.
 *
 * @example
 * // URI strategy
 * resolveVersion(new Request('http://localhost/v2/cats'), { type: 'uri', prefix: 'v' })
 * // → '2'
 *
 * // Header strategy
 * resolveVersion(req, { type: 'header', header: 'X-API-Version' })
 * // → value of X-API-Version header, or null
 *
 * // Media-type strategy
 * // Accept: application/vnd.myapi.v3+json
 * resolveVersion(req, { type: 'media-type', key: 'myapi' })
 * // → '3'
 */
export function resolveVersion(
  req: Request,
  opts: VersioningOptions,
): string | null {
  switch (opts.type) {
    case 'uri': {
      const prefix = opts.prefix ?? 'v'
      const pathname = new URL(req.url).pathname
      // Match /<prefix><digits>[/...] at the start of the path
      const pattern = new RegExp(`^/${escapeRegExp(prefix)}(\\d+)(?:/|$)`)
      const match = pathname.match(pattern)
      if (match?.[1]) return match[1]
      return opts.defaultVersion ?? null
    }

    case 'header': {
      const value = req.headers.get(opts.header)
      if (value) return value.trim()
      return opts.defaultVersion ?? null
    }

    case 'media-type': {
      const accept = req.headers.get('accept') ?? ''
      // Accept: application/vnd.<key>.v<N>+json
      const pattern = new RegExp(
        `application/vnd\\.${escapeRegExp(opts.key)}\\.v(\\d+)\\+json`,
        'i',
      )
      const match = accept.match(pattern)
      if (match?.[1]) return match[1]
      return opts.defaultVersion ?? null
    }
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
