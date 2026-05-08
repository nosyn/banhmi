/**
 * Default security headers applied by the Helmet middleware.
 *
 * Each entry is a `[headerName, defaultValue]` tuple. The default value is
 * used when the corresponding option key is `undefined` (not specified).
 * Setting an option to `false` omits the header entirely.
 *
 * @example
 * DEFAULT_HEADERS['Content-Security-Policy'] // "default-src 'self'"
 */
export const DEFAULT_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['Content-Security-Policy', "default-src 'self'"],
  ['Strict-Transport-Security', 'max-age=15552000; includeSubDomains'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'no-referrer'],
  ['Permissions-Policy', ''],
  ['X-Download-Options', 'noopen'],
  ['X-DNS-Prefetch-Control', 'off'],
] as const
