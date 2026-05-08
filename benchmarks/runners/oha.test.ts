import { expect, test } from 'bun:test'
import { parseOhaJson } from './oha'

test('parses oha JSON output without p999', () => {
  const sample = JSON.stringify({
    summary: { requestsPerSec: 1234.5, total: 60.1 },
    latencyPercentiles: { p50: 0.001, p95: 0.002, p99: 0.003 },
  })
  const r = parseOhaJson(sample)
  expect(r.rps).toBeCloseTo(1234.5, 1)
  expect(r.p99).toBeCloseTo(0.003, 4)
  // Falls back to p99 when p999 is absent
  expect(r.p99_9).toBeCloseTo(0.003, 4)
})

test('parses oha JSON output with p999', () => {
  const sample = JSON.stringify({
    summary: { requestsPerSec: 5000.0, total: 30.0 },
    latencyPercentiles: { p50: 0.0005, p95: 0.001, p99: 0.002, p999: 0.005 },
  })
  const r = parseOhaJson(sample)
  expect(r.rps).toBeCloseTo(5000.0, 0)
  expect(r.p99_9).toBeCloseTo(0.005, 4)
})
