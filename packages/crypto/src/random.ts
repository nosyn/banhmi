/**
 * Base64-URL encode a `Uint8Array` without padding characters.
 *
 * @param bytes - The bytes to encode.
 * @returns URL-safe base64 string with no `+`, `/`, or `=` characters.
 *
 * @example
 * toBase64Url(new Uint8Array([1, 2, 3]))
 */
export function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decode a base64-URL string (with or without padding) into a `Uint8Array`.
 *
 * @param s - URL-safe base64 string.
 * @returns The decoded bytes.
 *
 * @example
 * fromBase64Url('AQID')
 */
export function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (padded.length % 4)) % 4
  const b64 = padded + '='.repeat(padding)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/**
 * Generate cryptographically random bytes using `crypto.getRandomValues`.
 *
 * @param length - Number of random bytes to generate.
 * @returns A `Uint8Array` of the given length filled with random bytes.
 *
 * @example
 * const iv = randomBytes(12)
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generate a URL-safe base64 random token. Contains no `+`, `/`, or `=`
 * characters, making it safe to include in URLs and HTTP headers.
 *
 * @param bytes - Number of random bytes (entropy). Defaults to 32, which
 *   produces a 43-character token.
 * @returns Base64-URL encoded token with no padding.
 *
 * @example
 * const token = randomToken()        // 43 chars
 * const short = randomToken(16)      // 22 chars
 */
export function randomToken(bytes = 32): string {
  return toBase64Url(randomBytes(bytes))
}
