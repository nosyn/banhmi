import { describe, expect, test } from 'bun:test'
import { groupMatches } from '../src/groups'

describe('groupMatches', () => {
  test('no field groups → always included', () => {
    expect(groupMatches(undefined, ['admin'])).toBe(true)
    expect(groupMatches([], ['admin'])).toBe(true)
    expect(groupMatches(undefined, undefined)).toBe(true)
  })

  test('field has groups, active groups match → included', () => {
    expect(groupMatches(['admin'], ['admin'])).toBe(true)
    expect(groupMatches(['admin', 'superuser'], ['superuser'])).toBe(true)
  })

  test('field has groups, active groups do not match → excluded', () => {
    expect(groupMatches(['admin'], ['user'])).toBe(false)
    expect(groupMatches(['admin'], [])).toBe(false)
    expect(groupMatches(['admin'], undefined)).toBe(false)
  })
})
