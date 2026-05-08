/**
 * Import a raw secret string as a `CryptoKey` suitable for HMAC-SHA256.
 */
async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/**
 * Convert a `Uint8Array` to a base64url-encoded string (no padding).
 */
function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Parse a base64url-encoded string back to a `Uint8Array`.
 */
function fromBase64Url(str: string): Uint8Array {
  const padded =
    str.replace(/-/g, '+').replace(/_/g, '/') +
    '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i)
  }
  return buf
}

/**
 * Constant-time buffer comparison to prevent timing attacks during
 * HMAC signature verification.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

/**
 * Sign a value with HMAC-SHA256 and return `<value>.<base64url-signature>`.
 *
 * @param value - The plain string to sign.
 * @param secret - The signing secret.
 * @returns A signed string of the form `<value>.<base64url-sig>`.
 *
 * @example
 * const signed = await signValue('user-123', 'my-secret')
 * // 'user-123.Abc123...'
 */
export async function signValue(
  value: string,
  secret: string,
): Promise<string> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  )
  return `${value}.${toBase64Url(sig)}`
}

/**
 * Verify a signed value produced by {@link signValue}.
 *
 * Uses a constant-time comparison to prevent timing attacks. Returns the
 * original value if the signature is valid, or `null` if the signature is
 * missing, malformed, or doesn't match.
 *
 * @param signed - A signed string in the form `<value>.<base64url-sig>`.
 * @param secret - The secret used during signing.
 * @returns The original plain value, or `null` on verification failure.
 *
 * @example
 * const value = await verifyValue(signed, 'my-secret')
 * // 'user-123' on success, null on failure
 */
export async function verifyValue(
  signed: string,
  secret: string,
): Promise<string | null> {
  const dotIdx = signed.lastIndexOf('.')
  if (dotIdx < 0) return null

  const value = signed.slice(0, dotIdx)
  const sigStr = signed.slice(dotIdx + 1)

  try {
    const key = await importKey(secret)
    const expectedSig = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(value),
    )
    const providedSig = fromBase64Url(sigStr)

    if (!constantTimeEqual(new Uint8Array(expectedSig), providedSig)) {
      return null
    }

    return value
  } catch {
    return null
  }
}
