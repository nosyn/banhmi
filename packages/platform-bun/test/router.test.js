import { describe, expect, test } from 'bun:test'
import { RadixRouter } from '../src/router'

const noop = async (_ctx) => new Response('ok')
function makeRoute(method, path) {
  return {
    method,
    path,
    handler: noop,
    guards: [],
    interceptors: [],
    filters: [],
    httpCode: undefined,
    responseHeaders: [],
  }
}
describe('RadixRouter', () => {
  test('matches exact path', () => {
    const router = new RadixRouter()
    router.add(makeRoute('GET', '/cats'))
    const match = router.match('GET', '/cats')
    expect(match).not.toBeNull()
    expect(match?.params).toEqual({})
  })
  test('extracts single param', () => {
    const router = new RadixRouter()
    router.add(makeRoute('GET', '/cats/:id'))
    const match = router.match('GET', '/cats/123')
    expect(match?.params).toEqual({ id: '123' })
  })
  test('extracts multiple params', () => {
    const router = new RadixRouter()
    router.add(makeRoute('GET', '/users/:uid/posts/:pid'))
    const match = router.match('GET', '/users/42/posts/99')
    expect(match?.params).toEqual({ uid: '42', pid: '99' })
  })
  test('returns null for no match', () => {
    const router = new RadixRouter()
    expect(router.match('GET', '/nowhere')).toBeNull()
  })
  test('method discrimination', () => {
    const router = new RadixRouter()
    router.add(makeRoute('GET', '/cats'))
    router.add(makeRoute('POST', '/cats'))
    expect(router.match('GET', '/cats')).not.toBeNull()
    expect(router.match('POST', '/cats')).not.toBeNull()
    expect(router.match('DELETE', '/cats')).toBeNull()
  })
  test('does not match partial path', () => {
    const router = new RadixRouter()
    router.add(makeRoute('GET', '/cats'))
    expect(router.match('GET', '/cats/extra')).toBeNull()
  })
  test('ALL method matches any HTTP method', () => {
    const router = new RadixRouter()
    router.add(makeRoute('ALL', '/ping'))
    expect(router.match('GET', '/ping')).not.toBeNull()
    expect(router.match('POST', '/ping')).not.toBeNull()
    expect(router.match('DELETE', '/ping')).not.toBeNull()
  })
  test('wildcard matches any path suffix', () => {
    const router = new RadixRouter()
    router.add(makeRoute('GET', '/files/*'))
    expect(router.match('GET', '/files/a/b/c')).not.toBeNull()
    expect(router.match('GET', '/files/')).not.toBeNull()
  })
})
