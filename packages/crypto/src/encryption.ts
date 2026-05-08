import { fromBase64Url, randomBytes, toBase64Url } from './random'

/**
 * The result of {@link encrypt}. Both fields are base64-URL encoded (no
 * padding) and safe to store or transmit as JSON.
 *
 * @example
 * const result: EncryptionResult = await encrypt('hello', key)
 * const { ciphertext, iv } = result
 */
export type EncryptionResult = {
  /**
   * Base64-URL encoded ciphertext. The AES-GCM authentication tag (16 bytes)
   * is appended to the raw ciphertext before encoding, so it is included here.
   */
  ciphertext: string
  /**
   * Base64-URL encoded initialization vector (12 bytes). Required for
   * decryption.
   */
  iv: string
}

const KEY_USAGES: KeyUsage[] = ['encrypt', 'decrypt']
const AES_GCM_PARAMS = { name: 'AES-GCM', length: 256 } as const

/**
 * Import a raw 256-bit key from a base64-URL string.
 * @internal
 */
async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = fromBase64Url(keyBase64)
  return crypto.subtle.importKey('raw', raw, AES_GCM_PARAMS, false, KEY_USAGES)
}

/**
 * Generate a fresh 256-bit AES-GCM key, returned as a base64-URL encoded
 * string. Pass this string to {@link encrypt} and {@link decrypt}.
 *
 * @returns A Promise that resolves to the base64-URL encoded 32-byte key.
 *
 * @example
 * const key = await generateKey()
 * const result = await encrypt('hello', key)
 * const back = await decrypt(result, key)
 */
export async function generateKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(AES_GCM_PARAMS, true, KEY_USAGES)
  const raw = await crypto.subtle.exportKey('raw', key)
  return toBase64Url(new Uint8Array(raw))
}

/**
 * Encrypt a UTF-8 plaintext string using AES-256-GCM.
 *
 * A fresh 12-byte IV is generated for every call. The auth tag produced by
 * GCM is appended to the ciphertext before base64-URL encoding so the result
 * is self-contained.
 *
 * @param plaintext - The string to encrypt.
 * @param keyBase64 - A base64-URL encoded 256-bit AES key (e.g. from
 *   {@link generateKey}).
 * @returns A Promise resolving to an {@link EncryptionResult} containing
 *   `ciphertext` and `iv`, both base64-URL encoded.
 *
 * @example
 * const key = await generateKey()
 * const result = await encrypt('hello', key)
 * const back = await decrypt(result, key)
 */
export async function encrypt(
  plaintext: string,
  keyBase64: string,
): Promise<EncryptionResult> {
  const iv = randomBytes(12)
  const key = await importKey(keyBase64)
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  )
  return {
    ciphertext: toBase64Url(new Uint8Array(ciphertextBuffer)),
    iv: toBase64Url(iv),
  }
}

/**
 * Decrypt an {@link EncryptionResult} produced by {@link encrypt}.
 *
 * Throws a `DOMException` (`OperationError`) if the authentication tag
 * verification fails, which happens when the ciphertext or key has been
 * tampered with.
 *
 * @param payload - The `{ ciphertext, iv }` object from {@link encrypt}.
 * @param keyBase64 - The same base64-URL encoded key used for encryption.
 * @returns A Promise resolving to the original plaintext string.
 *
 * @example
 * const plaintext = await decrypt(encryptionResult, key)
 */
export async function decrypt(
  payload: EncryptionResult,
  keyBase64: string,
): Promise<string> {
  const iv = fromBase64Url(payload.iv)
  const ciphertext = fromBase64Url(payload.ciphertext)
  const key = await importKey(keyBase64)
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )
  return new TextDecoder().decode(plaintextBuffer)
}
