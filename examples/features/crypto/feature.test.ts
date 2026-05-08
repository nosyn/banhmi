import { expect, test } from 'bun:test'
import { runDemo } from './index'

test('crypto: password hash + verify round-trip', async () => {
  const { passwordCorrect, passwordWrong } = await runDemo()
  expect(passwordCorrect).toBe(true)
  expect(passwordWrong).toBe(false)
})

test('crypto: encrypt + decrypt round-trip', async () => {
  const { decrypted, plaintext } = await runDemo()
  expect(decrypted).toBe(plaintext)
})

test('crypto: randomToken is URL-safe', async () => {
  const { token, tokenIsUrlSafe } = await runDemo()
  expect(typeof token).toBe('string')
  expect(token.length).toBe(43)
  expect(tokenIsUrlSafe).toBe(true)
})
