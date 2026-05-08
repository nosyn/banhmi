// Demo: @banhmi/crypto — password hashing + AES-GCM encryption round-trips.
//
// Demonstrates:
//   1. Hash a password with Argon2id and verify it.
//   2. Generate a key, encrypt a string with AES-256-GCM, decrypt it back.
//   3. Generate a secure random URL-safe token.

import {
  decrypt,
  encrypt,
  generateKey,
  hashPassword,
  randomToken,
  verifyPassword,
} from '@banhmi/crypto'

/**
 * Run the crypto feature demo. Returns a results object for assertions in
 * the feature test.
 *
 * @example
 * const results = await runDemo()
 */
export async function runDemo() {
  // ---- Password hashing ----
  const passwordHash = await hashPassword('my-s3cret-password')
  const passwordCorrect = await verifyPassword(
    'my-s3cret-password',
    passwordHash,
  )
  const passwordWrong = await verifyPassword('wrong-password', passwordHash)

  // ---- AES-256-GCM encryption ----
  const key = await generateKey()
  const plaintext = 'Hello, Banhmi! 🔐'
  const encrypted = await encrypt(plaintext, key)
  const decrypted = await decrypt(encrypted, key)

  // ---- Secure random token ----
  const token = randomToken()

  return {
    passwordCorrect,
    passwordWrong,
    decrypted,
    plaintext,
    token,
    tokenIsUrlSafe:
      !token.includes('+') && !token.includes('/') && !token.includes('='),
  }
}
