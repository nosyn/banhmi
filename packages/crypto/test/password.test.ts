import { expect, test } from 'bun:test'
import { hashPassword, verifyPassword } from '../src/password'

test('password: hashPassword returns a non-empty string', async () => {
  const hash = await hashPassword('s3cret')
  expect(typeof hash).toBe('string')
  expect(hash.length).toBeGreaterThan(0)
})

test('password: round-trip verifyPassword returns true for correct password', async () => {
  const hash = await hashPassword('s3cret')
  const ok = await verifyPassword('s3cret', hash)
  expect(ok).toBe(true)
})

test('password: verifyPassword returns false for wrong password', async () => {
  const hash = await hashPassword('s3cret')
  const ok = await verifyPassword('wrong', hash)
  expect(ok).toBe(false)
})

test('password: default algorithm encodes argon2id in the hash', async () => {
  const hash = await hashPassword('test')
  // Argon2id PHC string starts with $argon2id
  expect(hash).toContain('argon2id')
})

test('password: respects custom memoryCost option', async () => {
  // Lower memoryCost for speed in tests
  const hash = await hashPassword('test', { memoryCost: 4096 })
  const ok = await verifyPassword('test', hash)
  expect(ok).toBe(true)
})

test('password: each hash is unique (random salts)', async () => {
  const h1 = await hashPassword('same')
  const h2 = await hashPassword('same')
  expect(h1).not.toBe(h2)
})
