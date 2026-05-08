import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '../../src/exceptions/http-exceptions'
import { ValidationPipe } from '../../src/pipes/validation.pipe'

// Minimal Standard Schema-compatible schema for testing (no external deps needed)
const numberSchema = {
  '~standard': {
    vendor: 'test',
    version: 1,
    validate: (v) =>
      typeof v === 'number' && v >= 0
        ? { value: v }
        : { issues: [{ message: 'Must be a non-negative number' }] },
  },
}
describe('ValidationPipe', () => {
  test('passes through valid value', async () => {
    const pipe = new ValidationPipe(numberSchema)
    await expect(pipe.transform(42, { type: 'body' })).resolves.toBe(42)
  })
  test('throws BadRequestException for invalid value', async () => {
    const pipe = new ValidationPipe(numberSchema)
    await expect(pipe.transform(-1, { type: 'body' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
