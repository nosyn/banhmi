import { describe, expect, test } from 'bun:test'
import { nextCronTime, parseCron } from '../src/cron-parser'

describe('parseCron', () => {
  test('* * * * * — every field is a Set of all valid values', () => {
    const p = parseCron('* * * * *')
    expect(p.minute.size).toBe(60) // 0-59
    expect(p.hour.size).toBe(24) // 0-23
    expect(p.dom.size).toBe(31) // 1-31
    expect(p.month.size).toBe(12) // 1-12
    expect(p.dow.size).toBe(7) // 0-6
    // Spot-check boundaries
    expect(p.minute.has(0)).toBe(true)
    expect(p.minute.has(59)).toBe(true)
    expect(p.hour.has(23)).toBe(true)
    expect(p.month.has(1)).toBe(true)
    expect(p.month.has(12)).toBe(true)
  })

  test('0 0 * * * — minute={0}, hour={0}', () => {
    const p = parseCron('0 0 * * *')
    expect(p.minute).toEqual(new Set([0]))
    expect(p.hour).toEqual(new Set([0]))
  })

  test('1-5 * * * * — minute={1,2,3,4,5}', () => {
    const p = parseCron('1-5 * * * *')
    expect(p.minute).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  test('*/15 * * * * — minute={0,15,30,45}', () => {
    const p = parseCron('*/15 * * * *')
    expect(p.minute).toEqual(new Set([0, 15, 30, 45]))
  })

  test('0-30/5 * * * * — range with step: minute={0,5,10,15,20,25,30}', () => {
    const p = parseCron('0-30/5 * * * *')
    expect(p.minute).toEqual(new Set([0, 5, 10, 15, 20, 25, 30]))
  })

  test('1,3,5 * * * * — list: minute={1,3,5}', () => {
    const p = parseCron('1,3,5 * * * *')
    expect(p.minute).toEqual(new Set([1, 3, 5]))
  })

  test('* 0,12 * * * — hour={0,12}', () => {
    const p = parseCron('* 0,12 * * *')
    expect(p.hour).toEqual(new Set([0, 12]))
  })

  test('rejects expression with wrong field count', () => {
    expect(() => parseCron('invalid')).toThrow()
    expect(() => parseCron('0 0 *')).toThrow()
    expect(() => parseCron('0 0 * * * *')).toThrow() // 6 fields
  })

  test('rejects out-of-range minute value', () => {
    expect(() => parseCron('60 0 * * *')).toThrow()
  })

  test('rejects out-of-range hour value', () => {
    expect(() => parseCron('0 24 * * *')).toThrow()
  })

  test('rejects invalid range (a > b)', () => {
    expect(() => parseCron('5-3 * * * *')).toThrow()
  })

  test('rejects invalid step value', () => {
    expect(() => parseCron('*/0 * * * *')).toThrow()
  })
})

describe('nextCronTime', () => {
  test('0 0 * * * — next time from now is the next midnight', () => {
    const parsed = parseCron('0 0 * * *')
    const now = new Date()
    const next = nextCronTime(parsed, now)

    expect(next.getMinutes()).toBe(0)
    expect(next.getHours()).toBe(0)
    expect(next.getTime()).toBeGreaterThan(now.getTime())
  })

  test('*/15 * * * * — from :07 the next is :15', () => {
    const parsed = parseCron('*/15 * * * *')
    const base = new Date('2026-01-01T10:07:00.000')
    const next = nextCronTime(parsed, base)
    expect(next.getMinutes()).toBe(15)
    expect(next.getHours()).toBe(10)
  })

  test('*/15 * * * * — from :15 exactly the next is :30', () => {
    const parsed = parseCron('*/15 * * * *')
    // nextCronTime advances past `after`, so from :15:00 the next is :30
    const base = new Date('2026-01-01T10:15:00.000')
    const next = nextCronTime(parsed, base)
    expect(next.getMinutes()).toBe(30)
  })

  test('0 12 * * * — next noon after a morning time', () => {
    const parsed = parseCron('0 12 * * *')
    const base = new Date('2026-01-01T09:00:00.000')
    const next = nextCronTime(parsed, base)
    expect(next.getHours()).toBe(12)
    expect(next.getMinutes()).toBe(0)
  })

  test('crosses a day boundary correctly', () => {
    const parsed = parseCron('0 0 * * *')
    // At 23:59, next midnight is tomorrow
    const base = new Date('2026-01-01T23:59:00.000')
    const next = nextCronTime(parsed, base)
    expect(next.getDate()).toBe(2) // January 2nd
    expect(next.getHours()).toBe(0)
    expect(next.getMinutes()).toBe(0)
  })

  test('crosses a month boundary correctly', () => {
    const parsed = parseCron('0 0 1 * *')
    // Jan 31st at 23:00 → Feb 1st midnight
    const base = new Date('2026-01-31T23:00:00.000')
    const next = nextCronTime(parsed, base)
    expect(next.getMonth()).toBe(1) // February (0-indexed)
    expect(next.getDate()).toBe(1)
    expect(next.getHours()).toBe(0)
    expect(next.getMinutes()).toBe(0)
  })
})
