import { expect, test } from 'bun:test'
import { parseOhaJson } from './oha'

test('parses oha JSON output', () => {
  const sample = JSON.stringify({
    summary: { requestsPerSec: 1234.5, total: 60.1 },
    latencyPercentiles: { p50: 0.001, p95: 0.002, p99: 0.003 },
  })
  const r = parseOhaJson(sample)
  expect(r.rps).toBeCloseTo(1234.5, 1)
  expect(r.p99).toBeCloseTo(0.003, 4)
})
