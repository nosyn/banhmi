import { expect, test } from 'bun:test'
import { decrypt, encrypt, generateKey } from '../src/encryption'

test('encryption: generateKey returns a non-empty base64-url string', async () => {
  const key = await generateKey()
  expect(typeof key).toBe('string')
  expect(key.length).toBeGreaterThan(0)
  // No padding or standard base64 chars
  expect(key).not.toContain('+')
  expect(key).not.toContain('/')
  expect(key).not.toContain('=')
})

test('encryption: generateKey produces a 32-byte key (43 base64url chars)', async () => {
  const key = await generateKey()
  // 32 bytes → 43 base64url chars (no padding)
  expect(key.length).toBe(43)
})

test('encryption: round-trip encrypt/decrypt returns original plaintext', async () => {
  const key = await generateKey()
  const result = await encrypt('hello world', key)
  const back = await decrypt(result, key)
  expect(back).toBe('hello world')
})

test('encryption: result contains ciphertext and iv fields', async () => {
  const key = await generateKey()
  const result = await encrypt('test', key)
  expect(typeof result.ciphertext).toBe('string')
  expect(typeof result.iv).toBe('string')
  expect(result.ciphertext.length).toBeGreaterThan(0)
  expect(result.iv.length).toBeGreaterThan(0)
})

test('encryption: IV is 12 bytes (16 base64url chars)', async () => {
  const key = await generateKey()
  const result = await encrypt('test', key)
  // 12 bytes → 16 base64url chars (no padding)
  expect(result.iv.length).toBe(16)
})

test('encryption: IV randomized per call (two encrypts produce different IVs)', async () => {
  const key = await generateKey()
  const r1 = await encrypt('same', key)
  const r2 = await encrypt('same', key)
  expect(r1.iv).not.toBe(r2.iv)
  expect(r1.ciphertext).not.toBe(r2.ciphertext)
})

test('encryption: tampered ciphertext throws on decrypt', async () => {
  const key = await generateKey()
  const result = await encrypt('hello', key)
  // Corrupt the ciphertext
  const tampered = {
    ...result,
    ciphertext: `${result.ciphertext.slice(0, -4)}XXXX`,
  }
  await expect(decrypt(tampered, key)).rejects.toThrow()
})

test('encryption: wrong key throws on decrypt', async () => {
  const key1 = await generateKey()
  const key2 = await generateKey()
  const result = await encrypt('secret', key1)
  await expect(decrypt(result, key2)).rejects.toThrow()
})

test('encryption: encrypts unicode strings correctly', async () => {
  const key = await generateKey()
  const plaintext = '日本語テスト 🔐'
  const result = await encrypt(plaintext, key)
  const back = await decrypt(result, key)
  expect(back).toBe(plaintext)
})
