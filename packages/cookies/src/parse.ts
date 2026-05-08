/**
 * Configuration options for {@link serializeCookie}.
 *
 * @example
 * serializeCookie('session', 'abc', {
 *   httpOnly: true,
 *   secure: true,
 *   sameSite: 'lax',
 *   maxAge: 3600,
 * })
 */
export type CookieOptions = {
  /** `Max-Age` in seconds. */
  maxAge?: number
  /** `Expires` as a `Date` object. */
  expires?: Date
  /** `Domain` attribute. */
  domain?: string
  /** `Path` attribute. Defaults to `'/'` when `path` is not specified. */
  path?: string
  /** Adds the `Secure` attribute. */
  secure?: boolean
  /** Adds the `HttpOnly` attribute. */
  httpOnly?: boolean
  /** `SameSite` attribute. */
  sameSite?: 'lax' | 'strict' | 'none'
}

/**
 * Map of cookie name → value returned by {@link parseCookies}.
 */
export type ParsedCookies = Record<string, string>

/**
 * Parse a `Cookie` request header value into a name → value map.
 *
 * Handles URL-percent-encoded values and RFC 6265 quoted strings
 * (surrounding double-quotes are stripped).
 *
 * @param header - The raw value of the `Cookie` header. An empty string or
 *   `undefined`/`null` returns an empty object.
 * @returns A `Record<string, string>` of parsed cookies.
 *
 * @example
 * parseCookies('uid=abc; token=xyz')
 * // { uid: 'abc', token: 'xyz' }
 *
 * parseCookies('val=%22hello%22')
 * // { val: '"hello"' }
 */
export function parseCookies(header: string): ParsedCookies {
  const result: ParsedCookies = {}
  if (!header) return result

  for (const pair of header.split(';')) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx < 0) continue

    const name = pair.slice(0, eqIdx).trim()
    if (!name) continue

    let value = pair.slice(eqIdx + 1).trim()

    // Strip surrounding double-quotes (RFC 6265 §4.1.1)
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1)
    }

    // URL-decode the value
    try {
      value = decodeURIComponent(value)
    } catch {
      // Leave value as-is if decoding fails
    }

    result[name] = value
  }

  return result
}

/**
 * Serialize a cookie name + value into a `Set-Cookie` header value string.
 *
 * @param name - Cookie name. Must be a valid cookie-name token.
 * @param value - Cookie value (will be URL-encoded).
 * @param opts - Optional `Set-Cookie` attributes.
 * @returns A string suitable for use as the value of a `Set-Cookie` header.
 *
 * @example
 * serializeCookie('uid', 'abc123', { httpOnly: true, path: '/', maxAge: 3600 })
 * // 'uid=abc123; Path=/; Max-Age=3600; HttpOnly'
 */
export function serializeCookie(
  name: string,
  value: string,
  opts: CookieOptions = {},
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`]

  if (opts.path !== undefined) {
    parts.push(`Path=${opts.path}`)
  }
  if (opts.domain !== undefined) {
    parts.push(`Domain=${opts.domain}`)
  }
  if (opts.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(opts.maxAge)}`)
  }
  if (opts.expires !== undefined) {
    parts.push(`Expires=${opts.expires.toUTCString()}`)
  }
  if (opts.secure) {
    parts.push('Secure')
  }
  if (opts.httpOnly) {
    parts.push('HttpOnly')
  }
  if (opts.sameSite !== undefined) {
    const sameMap = { lax: 'Lax', strict: 'Strict', none: 'None' } as const
    parts.push(`SameSite=${sameMap[opts.sameSite]}`)
  }

  return parts.join('; ')
}
