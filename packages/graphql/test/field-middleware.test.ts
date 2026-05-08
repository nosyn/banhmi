import { afterEach, describe, expect, test } from 'bun:test'
import type { FieldMiddlewareFn } from '../src'
import {
  addFieldMiddleware,
  applyFieldMiddlewares,
  clearFieldMiddlewares,
} from '../src'

afterEach(() => {
  clearFieldMiddlewares()
})

// ---------------------------------------------------------------------------
// applyFieldMiddlewares
// ---------------------------------------------------------------------------
describe('applyFieldMiddlewares', () => {
  test('calls resolver when no middlewares registered', async () => {
    const resolver = () => 'direct result'
    const wrapped = applyFieldMiddlewares('test', resolver, [])
    const result = await wrapped(null, {}, null, null)
    expect(result).toBe('direct result')
  })

  test('middleware can intercept and modify the result', async () => {
    const doubleMiddleware: FieldMiddlewareFn = async (_ctx, next) => {
      const result = await next()
      return (result as number) * 2
    }

    const resolver = () => 5
    const wrapped = applyFieldMiddlewares('count', resolver, [doubleMiddleware])
    const result = await wrapped(null, {}, null, null)
    expect(result).toBe(10)
  })

  test('middleware receives correct context', async () => {
    const capturedCtx: {
      fieldName?: string
      args?: Record<string, unknown>
    }[] = []

    const capturingMiddleware: FieldMiddlewareFn = async (ctx, next) => {
      capturedCtx.push({ fieldName: ctx.fieldName, args: ctx.args })
      return next()
    }

    const resolver = () => 'value'
    const wrapped = applyFieldMiddlewares('myField', resolver, [
      capturingMiddleware,
    ])
    await wrapped(null, { x: 42 }, null, null)

    expect(capturedCtx).toHaveLength(1)
    expect(capturedCtx[0]?.fieldName).toBe('myField')
    expect(capturedCtx[0]?.args).toEqual({ x: 42 })
  })

  test('multiple middlewares run in order', async () => {
    const order: string[] = []

    const first: FieldMiddlewareFn = async (_ctx, next) => {
      order.push('before-first')
      const r = await next()
      order.push('after-first')
      return r
    }

    const second: FieldMiddlewareFn = async (_ctx, next) => {
      order.push('before-second')
      const r = await next()
      order.push('after-second')
      return r
    }

    const resolver = () => {
      order.push('resolver')
      return 'result'
    }

    const wrapped = applyFieldMiddlewares('field', resolver, [first, second])
    await wrapped(null, {}, null, null)

    expect(order).toEqual([
      'before-first',
      'before-second',
      'resolver',
      'after-second',
      'after-first',
    ])
  })

  test('middleware can throw to reject the field', async () => {
    const authMiddleware: FieldMiddlewareFn = async (_ctx, _next) => {
      throw new Error('Unauthorized')
    }

    const resolver = () => 'secret'
    const wrapped = applyFieldMiddlewares('secret', resolver, [authMiddleware])
    expect(wrapped(null, {}, null, null)).rejects.toThrow('Unauthorized')
  })
})

// ---------------------------------------------------------------------------
// Global middleware registration
// ---------------------------------------------------------------------------
describe('Global field middleware registration', () => {
  test('addFieldMiddleware registers globally', async () => {
    const calls: string[] = []
    addFieldMiddleware(async (_ctx, next) => {
      calls.push('middleware')
      return next()
    })

    const resolver = () => 'value'
    const { getFieldMiddlewares } = await import('../src/middleware')
    const mws = getFieldMiddlewares()
    const wrapped = applyFieldMiddlewares('f', resolver, mws)
    await wrapped(null, {}, null, null)

    expect(calls).toEqual(['middleware'])
  })

  test('clearFieldMiddlewares removes all middlewares', async () => {
    addFieldMiddleware(async (_ctx, next) => next())
    addFieldMiddleware(async (_ctx, next) => next())

    const { getFieldMiddlewares } = await import('../src/middleware')
    expect(getFieldMiddlewares()).toHaveLength(2)

    clearFieldMiddlewares()
    expect(getFieldMiddlewares()).toHaveLength(0)
  })
})
