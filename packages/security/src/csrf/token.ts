import { randomToken } from '@banhmi/crypto'

/**
 * Generate a new CSRF token using `randomToken` from `@banhmi/crypto`.
 *
 * @returns A URL-safe base64 token suitable for use as a CSRF token.
 *
 * @example
 * const token = generateCsrfToken()
 */
export function generateCsrfToken(): string {
  return randomToken(32)
}
