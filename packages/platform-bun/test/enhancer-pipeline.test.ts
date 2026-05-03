import { describe, expect, test } from 'bun:test'
import { ForbiddenException, NotFoundException } from '@bunnest/common'
import type {
  CallHandler,
  ExceptionFilter,
  ExecutionContext,
  Guard,
  Interceptor,
} from '@bunnest/common'
import { runEnhancerPipeline } from '../src/enhancer-pipeline'
import { BunExecutionContext } from '../src/execution-context'
import { BunRouteCtx } from '../src/route-ctx'

function makeCtx(url = 'https://example.com/') {
  const req = new Request(url)
  const routeCtx = new BunRouteCtx(req, {})
  return new BunExecutionContext(routeCtx, class {}, () => null)
}

describe('runEnhancerPipeline', () => {
  test('executes handler and returns Response', async () => {
    const handler = async () => Response.json({ ok: true })
    const res = await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [],
      [],
      200,
      [],
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  test('serializes plain object to JSON response', async () => {
    const handler = async () => ({ name: 'Whiskers' })
    const res = await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [],
      [],
      200,
      [],
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: 'Whiskers' })
  })

  test('guard rejection returns 403', async () => {
    const guard: Guard = { canActivate: async () => false }
    const handler = async () => Response.json({})
    const res = await runEnhancerPipeline(
      makeCtx(),
      handler,
      [guard],
      [],
      [],
      200,
      [],
    )
    expect(res.status).toBe(403)
  })

  test('interceptor wraps handler', async () => {
    const order: string[] = []

    const interceptor: Interceptor = {
      async intercept(
        _ctx: ExecutionContext,
        next: CallHandler,
      ): Promise<Response> {
        order.push('before')
        const res = await next.handle()
        order.push('after')
        return res
      },
    }

    const handler = async () => {
      order.push('handler')
      return Response.json({})
    }

    await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [interceptor],
      [],
      200,
      [],
    )
    expect(order).toEqual(['before', 'handler', 'after'])
  })

  test('exception filter catches typed exception', async () => {
    const filter: ExceptionFilter<NotFoundException> = {
      catch(ex: NotFoundException): Response {
        return Response.json({ caught: ex.message }, { status: 404 })
      },
    }

    const handler = async () => {
      throw new NotFoundException('cat not found')
    }
    const res = await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [],
      [{ filterInstance: filter, type: NotFoundException }],
      200,
      [],
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ caught: 'cat not found' })
  })

  test('response headers are applied', async () => {
    const handler = async () => Response.json({})
    const res = await runEnhancerPipeline(makeCtx(), handler, [], [], [], 200, [
      ['X-Custom', 'yes'],
    ])
    expect(res.headers.get('X-Custom')).toBe('yes')
  })

  test('httpCode overrides default status', async () => {
    const handler = async () => ({ id: 1 })
    const res = await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [],
      [],
      201,
      [],
    )
    expect(res.status).toBe(201)
  })

  test('null return produces 204', async () => {
    const handler = async () => null
    const res = await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [],
      [],
      200,
      [],
    )
    expect(res.status).toBe(204)
  })

  test('unhandled error falls back to GlobalExceptionFilter', async () => {
    const handler = async () => {
      throw new Error('boom')
    }
    const res = await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [],
      [],
      200,
      [],
    )
    expect(res.status).toBe(500)
  })

  test('multiple interceptors execute in correct order', async () => {
    const order: string[] = []

    const interceptorA: Interceptor = {
      async intercept(
        _ctx: ExecutionContext,
        next: CallHandler,
      ): Promise<Response> {
        order.push('A-before')
        const res = await next.handle()
        order.push('A-after')
        return res
      },
    }

    const interceptorB: Interceptor = {
      async intercept(
        _ctx: ExecutionContext,
        next: CallHandler,
      ): Promise<Response> {
        order.push('B-before')
        const res = await next.handle()
        order.push('B-after')
        return res
      },
    }

    const handler = async () => {
      order.push('handler')
      return Response.json({})
    }

    await runEnhancerPipeline(
      makeCtx(),
      handler,
      [],
      [interceptorA, interceptorB],
      [],
      200,
      [],
    )
    expect(order).toEqual([
      'A-before',
      'B-before',
      'handler',
      'B-after',
      'A-after',
    ])
  })
})
