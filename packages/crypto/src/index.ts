/**
 * @banhmi/crypto — Cryptographic helpers for Banhmi applications.
 *
 * Provides Argon2id password hashing via `Bun.password`, AES-256-GCM
 * encryption via the Web Crypto API, and secure random utilities.
 * All functions are pure with no DI or module registration required.
 *
 * @example
 * import { hashPassword, verifyPassword, generateKey, encrypt, decrypt, randomToken } from '@banhmi/crypto'
 *
 * const hash = await hashPassword('s3cret')
 * const ok = await verifyPassword('s3cret', hash) // true
 *
 * const key = await generateKey()
 * const result = await encrypt('hello world', key)
 * const back = await decrypt(result, key) // 'hello world'
 *
 * const token = randomToken() // 43-char URL-safe token
 */

export type { EncryptionResult } from './encryption'
export { decrypt, encrypt, generateKey } from './encryption'
export type { PasswordOptions } from './password'
export { hashPassword, verifyPassword } from './password'
export { fromBase64Url, randomBytes, randomToken, toBase64Url } from './random'
